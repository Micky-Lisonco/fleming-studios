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
and builds one tone curve for it:
  levels      the shot's own 1st and 99.5th percentile become black and
              white, so every shot has real blacks and real whites
  midtones    a gamma on top, solved so the median luma reaches TARGET_MED
  S-curve     a fixed amount of contrast (S_CURVE), shadows down and
              highlights up around the middle
then solves saturation to TARGET_SAT. The curve goes to the renderer as an
SVG table, and the maths here is the renderer's.

The first version lifted with gamma alone, to a brighter target: that
raises the blacks along with everything else, and Michael was right that it
came out milky, with no contrast.

Needs Pillow and Node 22+. Contact sheets are read from out/<project>/lookbook
and, for shots with no project (Normocare), out/lookbook - override that one
with NORMOCARE_LOOKBOOK if it lives elsewhere.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILMS = ["elite-header-wide", "elite-ad"]
TARGET_MED, TARGET_SAT = 118, 80
S_CURVE, WARMTH = 0.35, 1.02
CURVE_POINTS = 33

def lookbook(project):
    if project:
        return os.path.join(ROOT, "out", project, "lookbook")
    return os.environ.get("NORMOCARE_LOOKBOOK", os.path.join(ROOT, "out", "lookbook"))

def smooth(x):
    return x * x * (3 - 2 * x)

def curve_fn(b, w, g):
    """Levels (b..w -> 0..1), then gamma g, then the S-curve."""
    def f(x):
        y = min(1.0, max(0.0, (x - b) / (w - b)))
        y = y ** g
        return (1 - S_CURVE) * y + S_CURVE * smooth(y)
    return f

def curve_lut(f):
    return [max(0, min(255, round(f(v / 255) * 255))) for v in range(256)]

def table_lut(table):
    """What the SVG table does: piecewise linear through evenly spaced points."""
    n = len(table) - 1; out = []
    for v in range(256):
        x = v / 255 * n; i = min(int(x), n - 1); t = x - i
        out.append(max(0, min(255, round((table[i] * (1 - t) + table[i + 1] * t) * 255))))
    return out

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
        b = min(pct(fr, .01), 40) / 255          # black point, never more than 40
        w = max(pct(fr, .995), 190) / 255        # white point, never below 190
        g = solve(lambda g: pct(fr.point(curve_lut(curve_fn(b, w, g)) * 3), .5), TARGET_MED, .45, 2.2, False)
        # With levels and the S in place a deeper mid lift no longer washes
        # the picture out, so a subject in a dark corner can come up further.
        g = max(0.45, min(1.8, g))
        f = curve_fn(b, w, g)
        table = [round(f(i / (CURVE_POINTS - 1)), 4) for i in range(CURVE_POINTS)]
        toned = fr.point(table_lut(table) * 3)
        sv = max(1.0, min(1.8, solve(lambda x: sat(apply(toned, 1, 1, x, 1)), TARGET_SAT, .8, 2.4, True)))
        grades[s["id"]] = {"gamma": 1, "contrast": 1, "saturation": round(sv, 3), "warmth": WARMTH, "curve": table}
        after = apply(toned, 1, 1, sv, WARMTH)
        rows.append((s["id"], fr, after, pct(fr, .5), pct(after, .5), pct(fr, .9) - pct(fr, .1), pct(after, .9) - pct(after, .1)))
    if sheet_path:
        v = shots[0]["vertical"]; tw = 150 if v else 240; th = round(tw * 16 / 9) if v else round(tw * 9 / 16)
        cols = 10 if v else 8; nr = (len(rows) + cols - 1) // cols
        sh = Image.new("RGB", (cols * (tw + 4), nr * (2 * th + 34)), (12, 12, 12)); d = ImageDraw.Draw(sh)
        for i, (sid, a, b, m0, m1, c0, c1) in enumerate(rows):
            x, y = (i % cols) * (tw + 4), (i // cols) * (2 * th + 34)
            sh.paste(a.resize((tw, th)), (x, y + 14)); sh.paste(b.resize((tw, th)), (x, y + 18 + th))
            d.text((x + 2, y + 2), sid[:16], fill=(255, 230, 80)); d.text((x + 2, y + 20 + 2 * th), f"luma {m0}->{m1} contrast {c0}->{c1}", fill=(200, 200, 200))
        sh.save(sheet_path)
    before = [r[3] for r in rows]; after = [r[4] for r in rows]
    cb = [r[5] for r in rows]; ca = [r[6] for r in rows]
    return grades, (min(before), max(before), min(after), max(after), round(sum(cb) / len(cb)), round(sum(ca) / len(ca)))

def write_block(grades, spans):
    path = os.path.join(ROOT, "remotion", "edit.ts")
    src = open(path, encoding="utf-8").read()
    a = src.index("export const ELITE_SHOT_GRADES")
    b = src.index("};\n// </elite-grades>", a)
    lines = "\n".join(f'  "{k}": {{ gamma: {v["gamma"]}, contrast: {v["contrast"]}, saturation: {v["saturation"]}, warmth: {v["warmth"]},\n    curve: [{", ".join(str(c) for c in v["curve"])}] }},'
                      for k, v in grades.items())
    src = src[:a] + 'export const ELITE_SHOT_GRADES: Record<string, NonNullable<Shot["grade"]>> = {\n' + lines + "\n" + src[b:]
    open(path, "w", encoding="utf-8").write(src)

if __name__ == "__main__":
    sheets = sys.argv[sys.argv.index("--sheets") + 1] if "--sheets" in sys.argv else None
    man = manifests(); allg = {}
    for film, shots in export_shots().items():
        g, (b0, b1, a0, a1, c0, c1) = grade_film(shots, man, sheets and os.path.join(sheets, f"{film}-grade.png"))
        allg.update(g)
        print(f"{film}: {len(g)} shots, median luma {b0}-{b1} -> {a0}-{a1}, contrast (P90-P10) avg {c0} -> {c1}")
    write_block(allg, None)
    print(f"Wrote {len(allg)} grades into remotion/edit.ts")
