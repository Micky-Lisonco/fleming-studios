#!/usr/bin/env python3
"""
Report what a .cube LUT actually does.

A LUT arriving by email is easy to get wrong: a creative look instead of
the conversion, the wrong log profile, an inverse LUT, or one built for a
different range. All of those load without complaint and quietly ruin the
picture. This probes the transform at known points and says which it
looks like.

    python3 scripts/inspect-lut.py path/to/file.cube
"""
import sys


def load(path):
    size, domain_min, domain_max, title = None, [0.0] * 3, [1.0] * 3, None
    data = []
    for raw in open(path, encoding="utf-8", errors="replace"):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        key = parts[0].upper()
        if key == "LUT_3D_SIZE":
            size = int(parts[1])
        elif key == "LUT_1D_SIZE":
            raise SystemExit("This is a 1D LUT. ffmpeg's lut3d needs a 3D one.")
        elif key == "TITLE":
            title = line.split('"')[1] if '"' in line else " ".join(parts[1:])
        elif key == "DOMAIN_MIN":
            domain_min = [float(x) for x in parts[1:4]]
        elif key == "DOMAIN_MAX":
            domain_max = [float(x) for x in parts[1:4]]
        elif len(parts) == 3:
            try:
                data.append(tuple(float(x) for x in parts))
            except ValueError:
                pass
    if size is None:
        raise SystemExit("No LUT_3D_SIZE found - this does not look like a .cube file.")
    if len(data) != size ** 3:
        raise SystemExit(f"Truncated: expected {size**3} entries, found {len(data)}.")
    return size, domain_min, domain_max, title, data


def sample(size, data, r, g, b):
    """Nearest-neighbour lookup. Enough to characterise the curve."""
    def idx(v):
        return min(size - 1, max(0, round(v * (size - 1))))
    # .cube files vary red fastest.
    return data[idx(b) * size * size + idx(g) * size + idx(r)]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    size, dmin, dmax, title, data = load(path)

    print(f"file    {path}")
    if title:
        print(f"title   {title}")
    print(f"size    {size}x{size}x{size} ({len(data)} entries)")
    print(f"domain  {dmin} to {dmax}")
    if dmax != [1.0] * 3 or dmin != [0.0] * 3:
        print("        NOTE: non-standard domain. ffmpeg assumes 0-1; this may need care.")
    print()

    points = [("black", 0.0), ("shadow", 0.2), ("mid grey", 0.5), ("highlight", 0.8), ("white", 1.0)]
    print("grey ramp (input -> output luma)")
    outs = []
    for name, v in points:
        o = sample(size, data, v, v, v)
        luma = 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2]
        outs.append(luma)
        print(f"  {name:<10} {v:.2f} -> {luma:.3f}")
    print()

    black, mid, white = outs[0], outs[2], outs[4]
    contrast = white - black

    # A log-to-display conversion pulls the lifted blacks of log down and
    # stretches the range, so mid grey lands well below its input value.
    verdict = []
    if mid < 0.42:
        verdict.append("pulls mid grey down - consistent with a log-to-display conversion")
    elif mid > 0.58:
        verdict.append("lifts mid grey - this looks like an INVERSE (display-to-log) LUT")
    else:
        verdict.append("leaves mid grey roughly where it was - likely a creative look, not a conversion")

    if black > 0.06:
        verdict.append(f"black sits at {black:.3f}, not 0 - lifted blacks, a washed look")
    if contrast < 0.8:
        verdict.append(f"compresses range to {contrast:.2f} - low contrast")

    # Does it move colours differently from greys? A pure contrast curve
    # will not; a real conversion usually will. Probed off the extremes:
    # a fully saturated primary clamps negative cross-talk to zero and
    # hides exactly the mixing this is looking for.
    # Reported as a measurement rather than a verdict: the values that
    # separate a colour transform from a plain curve sit close together,
    # and nearest-neighbour sampling adds noise of its own. The mid grey
    # reading above is the reliable signal.
    probe = sample(size, data, 0.7, 0.35, 0.35)
    grey = sample(size, data, 0.35, 0.35, 0.35)
    mixing = abs((probe[1] - grey[1]) - (probe[2] - grey[2]))
    verdict.append(
        f"channel cross-talk {mixing:.4f} "
        + ("(a colour transform, not just a curve)" if mixing > 0.004
           else "(close to a pure tone curve)")
    )

    print("reading")
    for v in verdict:
        print(f"  - {v}")


if __name__ == "__main__":
    main()
