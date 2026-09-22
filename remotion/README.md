# Normocare — 20s vertical ad (Remotion)

**Client:** Normocare, the oxygen room (normobaric therapy)
**Venue:** Flanders Cobblestone Paradise, Brakel — Flemish Ardennes
**Deliverable:** 20s, 1080×1920, H.264 — Reels / TikTok / Shorts

Built from the raw camera files. Nothing is pre-edited: each clip is
described in `remotion/edit.ts` and composed at render time, so a recut
is a data change, not a re-export.

```bash
npm run video          # Remotion Studio — scrub and tweak live
npm run video:render   # out/fleming-ad.mp4
npm run video:still    # thumbnail for the feed
```

## The 14 GB problem

The masters never need to be uploaded anywhere. This is a standard
offline/online workflow:

1. **Proxy.** On the machine holding the footage:
   ```bash
   ./scripts/make-proxies.sh /path/to/the/masters
   ```
   That writes a small stand-in per clip to `public/media-proxy/`, a
   six-frame filmstrip per clip to `out/lookbook/`, and a `manifest.json`
   with every clip's real duration, resolution and frame rate.

2. **Cut against the proxies.** Same filenames, same framing, same
   durations as the masters — so every frame number in `edit.ts` maps
   straight onto the full-resolution file.

3. **Render against the masters.** Drop them in `public/media/` and:
   ```bash
   REMOTION_MEDIA_DIR=media npm run video:render
   ```
   One variable. No re-linking, no recutting.

The filmstrips and `manifest.json` come to a few MB in total and are
enough to design the whole cut from — send those first; the proxies only
matter when it's time to judge motion.

## Where things live

| Path | What it is |
| --- | --- |
| `remotion/edit.ts` | **The edit.** Clip order, durations, trims, captions, music. The only file that needs touching per revision. |
| `scripts/make-proxies.sh` | Masters → proxies + filmstrips + manifest. |
| `public/media-proxy/` | Light stand-ins. Safe to commit if small. |
| `public/media/` | The camera masters. Keep out of git. |
| `remotion/components/` | Caption type, end card, vignette, progress hairline. |
| `out/` | Renders and lookbook. Gitignored. |

## Pointing a shot at a file

```ts
{ id: "03-climb", file: "03-koppenberg.mp4", kind: "video",
  durationInFrames: 33, startFrom: 48, caption: "RIDE HARD",
  accent: BRAND.cobble },
```

`startFrom: 48` starts 1.6 seconds into the clip. A shot left as
`file: null` renders a labelled placeholder, so the edit always plays end
to end while footage is still arriving.

## Structure

30 frames = 1 second. Two halves, and the palette turn at shot 06 is the
story beat — the ride is warm stone, the recovery is oxygen blue. Keep
that flip where it is even if clips move around it.

- **0.0–8.2s** the ride: cobbles, effort, legs gone
- **8.2–12.6s** the turn: arrival, the chamber
- **12.6–17.7s** the repair: the session
- **17.7–18.5s** the payoff: the morning after
- **18.5–20.0s** end card

The composition's length is whatever the shots add up to, so changing one
duration never breaks the render — but the console warns when the cut has
drifted off the 20-second brief.

## Claims

Copy in `edit.ts` is deliberately kept to what the client's own materials
support ("lactate cleared", "soreness eased"). Specific numeric claims —
stem-cell multiples, recovery percentages — are not in the cut and should
not go in without Normocare signing them off; health claims in Belgium
and the EU are regulated.

## Safe areas

Captions sit 360px clear of the bottom, out of the caption and CTA
furniture TikTok, Reels and Shorts overlay on the lower fifth. If a
platform still clips something, raise `bottom` in `components/Caption.tsx`.

## Rendering where Chromium already exists

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome npm run video:render
```
