# Fleming Studios — vertical ad (Remotion)

A 20-second, 1080×1920 social cut, built from a list of source files.
Nothing needs to be pre-edited: drop the raw clips in, describe the cut,
render.

## The short version

```bash
npm run video          # opens the Remotion Studio — scrub, preview, tweak live
npm run video:render   # writes out/fleming-ad.mp4
npm run video:still    # writes out/thumbnail.png for the feed thumbnail
```

## Where things live

| Path | What it is |
| --- | --- |
| `remotion/edit.ts` | **The edit.** Clip order, durations, captions, music. This is the only file you need to touch day to day. |
| `public/media/` | The source files. Drop the 15 clips here. |
| `remotion/VerticalAd.tsx` | Lays the shots out on the timeline. Rarely needs changing. |
| `remotion/components/` | Caption type, end card, vignette, progress hairline. |
| `out/` | Renders. Gitignored. |

## Adding the footage

1. Copy the files into `public/media/` — `.mp4` and `.mov` both work, as do
   stills (`.jpg`, `.png`).
2. In `remotion/edit.ts`, point each shot at its file:

```ts
{ id: "03", src: "media/hero-shot.mp4", kind: "video", durationInFrames: 33,
  startFrom: 48, caption: "BRANDING", accent: BRAND.cyan },
```

`startFrom` trims the head off a clip — `48` starts 1.6 seconds in. Any shot
still left as `src: null` renders a labelled placeholder card, so the cut
always plays end to end while the footage is still coming in.

## Timing

30 frames = 1 second. The composition's length is whatever the shots add up
to, so a change to one duration never breaks the render — but the console
warns if the cut has drifted off the 20-second brief.

The default shape: a 2.5s hook, twelve 1.1s cuts through the body, a 1.5s
payoff, then a 1.5s end card.

## Sound

Clips are muted by default so a music bed stays clean. Point `MUSIC.src` at a
track in `public/media/`, or set `audible: true` on any single shot to let its
own sound through.

## Safe areas

Captions sit 360px clear of the bottom edge, which keeps them out of the
caption/CTA furniture TikTok, Reels and Shorts overlay on the lower fifth of
the screen. If a platform's UI still clips something, raise `bottom` in
`components/Caption.tsx`.

## Rendering on a machine that already has Chromium

Remotion downloads its own headless browser by default. To reuse one you
already have:

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome npm run video:render
```
