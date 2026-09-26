"""Solve one colour grade per shot so every shot lands on the same look,
and write them into remotion/edit.ts (the <elite-grades> block).

    python scripts/grade-shots.py                 # elite-header-wide, elite-ad
    python scripts/grade-shots.py --sheets out    # also writes before/after sheets

Run it after any change to the Elite shot lists: a new in-point or a new
vertical framing changes what the viewer sees, so the grade has to be
solved again.

For each shot it takes the contact-sheet frame the shot opens on (in-points
sit exactly on those frames: frame k of a clip of length D is at k x D / 6.5
s), cropped to what the viewer sees - the 9:16 slice for a vertical film -
and solves:
  gamma       so the median luma reaches TARGET_MED, and the darkest fifth
              at least TARGET_P20 - a median alone misses a subject
              standing dark against a bright window
  saturation  so the mean saturation reaches TARGET_SAT
with fixed contrast and warmth. The maths is the renderer's SVG filter.

Needs Pillow and Node 22+. Contact sheets are read from out/<project>/lookbook
and, for shots with no project (Normocare), out/lookbook - override that one
with NORMOCARE_LOOKBOOK if it lives elsewhere.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILMS = ["elite-header-wide", "elite-ad"]
TARGET_MED, TARGET_P20, TARGET_SAT = 132, 78, 92
CONTRAST, WARMTH = 1.10, 1.02

def lookbook(project):
    if project:
        return os.path.join(ROOT, "out", project, "lookbook")
    return os.environ.get("NORMOCARE_LOOKBOOK", os.path.join(ROOT, "out", "lookbook"))

def lut(g, c):
    return [max(0, min(255, round((c * (((v / 255) ** g) - 0.5) + 0.5) * 255))) for v in range(256)]

def apply(im, g, c, s, w):
    im = im.point(lut(g, c) * 3)
    m = (0.213+0.787*s, 0.715-0.715*s, 0.072-0.072*s, 0,
         0.213-0.213*s, 0.715+0.285*s, 0.072-0.072*s, 0,
         0.213-0.213*s, 0.715-0.715*s, 0.072+0.928*s, 0)
    im = im.convert("RGB", m)
    r, gg, b = im.split()
    return Image.merge("RGB", (r.point(lambda v: min(255, round(v * w))), gg, b.point(lambda v: round(v * (2 - w)))))

def pct(im, p):
    h = im.convert("L").histogram(); n = sum(h); acc = 0
    for v, c in enumerate(h):
        acc += c
        if acc >= n * p:
            return v
    return 255

def sat(im):
    return ImageStat.Stat(im.convert("HSV")).mean[1]

def solve(fn, target, lo, hi, increasing):
    for _ in range(22):
        mid = (lo + hi) / 2
        if (fn(mid) < target) == increasing: lo = mid
        else: hi = mid
    return (lo + hi) / 2

def export_shots():
    js = ("import('./remotion/edit.ts').then(({FILMS})=>{const o={};for(const id of %s){const f=FILMS[id];"
          "o[id]=f.shots.map(s=>({id:s.id,project:s.project??null,file:s.file,startFrom:s.startFrom??0,"
          "focusX:s.focus?parseFloat(s.focus):50,pan:s.pan??null,vertical:f.format==='vertical'}))}"
          "console.log(JSON.stringify(o))})") % json.dumps(FILMS)
    out = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e", js],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def manifests():
    man = {}
    for proj in (None, "elite"):
        path = os.path.join(lookbook(proj), "manifest.json")
        for r in json.load(open(path, encoding="utf-8-sig")):
            man[(proj, r["id"] + ".mp4")] = r
    return man

def grade_film(shots, man, sheet_path=None):
    grades, rows = {}, []
    for s in shots:
        D = man[(s["project"], s["file"])]["durationSec"]
        k = max(0, min(5, round(s["startFrom"] / 25 * 6.5 / D)))
        strip = Image.open(os.path.join(lookbook(s["project"]), s["file"][:-4] + ".jpg"))
        fw = strip.width // 6
        fr = strip.crop((k * fw, 0, (k + 1) * fw, strip.height)).convert("RGB")
        if s["vertical"]:
            cw = round(fr.height * 9 / 16)
            fx = (s["pan"][0] if s["pan"] else s["focusX"]) / 100
            cx = round((fr.width - cw) * fx)
            fr = fr.crop((cx, 0, cx + cw, fr.height))
        g_med = solve(lambda g: pct(fr.point(lut(g, CONTRAST) * 3), .5), TARGET_MED, .3, 1.8, False)
        g_p20 = solve(lambda g: pct(fr.point(lut(g, CONTRAST) * 3), .2), TARGET_P20, .3, 1.8, False)
        # 0.36 lifts a subject in a dark corner; up to 1.6 brings a sun-blown
        # shot down to the others instead of letting it stand out.
        g = max(0.36, min(1.6, min(g_med, g_p20)))
        lifted = fr.point(lut(g, CONTRAST) * 3)
        sv = max(0.9, min(2.2, solve(lambda x: sat(apply(lifted, 1, 1, x, 1)), TARGET_SAT, .8, 2.4, True)))
        grades[s["id"]] = {"gamma": round(g, 3), "contrast": CONTRAST, "saturation": round(sv, 3), "warmth": WARMTH}
        after = apply(fr, g, CONTRAST, sv, WARMTH)
        rows.append((s["id"], fr, after, pct(fr, .5), pct(after, .5)))
    if sheet_path:
        v = shots[0]["vertical"]; tw = 150 if v else 240; th = round(tw * 16 / 9) if v else round(tw * 9 / 16)
        cols = 10 if v else 8; nr = (len(rows) + cols - 1) // cols
        sh = Image.new("RGB", (cols * (tw + 4), nr * (2 * th + 34)), (12, 12, 12)); d = ImageDraw.Draw(sh)
        for i, (sid, a, b, m0, m1) in enumerate(rows):
            x, y = (i % cols) * (tw + 4), (i // cols) * (2 * th + 34)
            sh.paste(a.resize((tw, th)), (x, y + 14)); sh.paste(b.resize((tw, th)), (x, y + 18 + th))
            d.text((x + 2, y + 2), sid[:16], fill=(255, 230, 80)); d.text((x + 2, y + 20 + 2 * th), f"luma {m0}->{m1}", fill=(200, 200, 200))
        sh.save(sheet_path)
    before = [r[3] for r in rows]; after = [r[4] for r in rows]
    return grades, (min(before), max(before), min(after), max(after))

def write_block(grades, spans):
    path = os.path.join(ROOT, "remotion", "edit.ts")
    src = open(path, encoding="utf-8").read()
    a = src.index("export const ELITE_SHOT_GRADES")
    b = src.index("};\n// </elite-grades>", a)
    lines = "\n".join(f'  "{k}": {{ gamma: {v["gamma"]}, contrast: {v["contrast"]}, saturation: {v["saturation"]}, warmth: {v["warmth"]} }},'
                      for k, v in grades.items())
    src = src[:a] + 'export const ELITE_SHOT_GRADES: Record<string, NonNullable<Shot["grade"]>> = {\n' + lines + "\n" + src[b:]
    open(path, "w", encoding="utf-8").write(src)

if __name__ == "__main__":
    sheets = sys.argv[sys.argv.index("--sheets") + 1] if "--sheets" in sys.argv else None
    man = manifests(); allg = {}
    for film, shots in export_shots().items():
        g, (b0, b1, a0, a1) = grade_film(shots, man, sheets and os.path.join(sheets, f"{film}-grade.png"))
        allg.update(g)
        print(f"{film}: {len(g)} shots, median luma {b0}-{b1} -> {a0}-{a1}")
    write_block(allg, None)
    print(f"Wrote {len(allg)} grades into remotion/edit.ts")
