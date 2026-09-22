# Flanders Cobblestone Paradise — the oxygen room (Remotion)

**Voice:** Flanders Cobblestone Paradise — the ad comes from the hotel
**Subject:** their oxygen room, the only one in the Benelux
**Deliverables:** 20s in two formats, H.264

| Format | Size | Where it goes |
| --- | --- | --- |
| `<variant>` | 1080×1920 | Meta and TikTok |
| `<variant>-wide` | 1920×1080 | the website hero |

Both are cut from one timeline, so a change to the edit lands in both.

## Language policy — read before touching the copy

From the client proposal, and it is a legal position as much as a
creative one:

> Wel herstel, ontspanning, energie en prestatie.
> Geen aandoeningen, geen genezing, geen medische claims.

Recovery, relaxation, energy and performance are in. Conditions, cures
and medical promises are out, and so is technical language — it is a
**zuurstofkamer**, never a "normobaric chamber". What the ad promises is
the experience: an hour in a quiet room, in a relax chair, waking up
fitter the next day.

## Campaigns

The proposal splits the audience into four markets and recommends
starting with two. Each is a composition; they share the timeline, so
they cannot drift apart:

| Composition | Market |
| --- | --- |
| `sporter-nl` | the athlete who takes recovery seriously |
| `particulier-nl` | the individual, no sport — the proposal's first pick |
| `sporter-en` | the British and international sport tourist |

Add `-wide` to any of them for the 1920×1080 cut.

Built from the raw camera files. Nothing is pre-edited: each clip is
described in `remotion/edit.ts` and composed at render time, so a recut
is a data change, not a re-export.

```bash
npm run video              # Remotion Studio — scrub and tweak live
npm run video:render       # the vertical cut
npm run video:render:wide  # the website cut
npm run video:render:all   # every campaign in both formats
```

## The footage never moves

The masters stay on whatever drive they live on. Nothing is uploaded and
nothing is copied. Three scripts run where the footage is and emit a
megabyte of text between them, which is all the edit actually needs.

```bash
./scripts/analyse-footage.sh /Volumes/YourDrive/oxygen-shoot   # what is it
./scripts/make-proxies.sh    /Volumes/YourDrive/oxygen-shoot   # stand-ins
./scripts/transcribe.sh                                        # what is said
```

`analyse-footage.sh` reads the files in place and reports codec, resolution,
frame rate, colour handling, rotation, exposure and audio loudness, flagging
what needs treatment — HDR that will render washed out, a log profile waiting
on a LUT, dialogue too quiet for social. It writes `out/analysis/report.txt`
and `footage.json`, both plain text.

## Interview footage

This is not b-roll. The cameraman asks, Fien Merckx answers, and the cut is
decided by what she says and exactly when — so the transcripts are not
optional and neither are burned-in subtitles. Most of Meta and TikTok plays
muted; an unsubtitled answer is a silent shot of someone'"'"'s face.

A soundbite shot carries `audible: true`, a `subtitles` array and a
`startFrom` pointing at the moment the sentence begins in the master. The
music bed ducks under every audible shot automatically, derived from the
shots themselves, so moving a clip moves its ducking with it. The
cameraman'"'"'s questions stay out of the cut.

Subtitle frames are relative to the shot, not the timeline: the time in the
`.srt` minus `startFrom` in seconds, times 30.

## Proxies, when you want to judge motion

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
| `scripts/render-all.mjs` | Every campaign in both formats, one after another. |
| `remotion/components/` | Caption type, end card, vignette, progress hairline. |
| `out/` | Renders and lookbook. Gitignored. |

## Pointing a shot at a file

Shots carry footage and timing; the words live in `VARIANTS`, keyed by
shot id. That split is what lets three campaigns share one cut.

```ts
{ id: "05-reveal", file: "05-kamer.mp4", kind: "video",
  durationInFrames: 33, startFrom: 48, focus: "38% 50%",
  accent: BRAND.oxygen },
```

`startFrom: 48` starts 1.6 seconds into the clip. A shot left as
`file: null` renders a labelled placeholder, so the edit always plays end
to end while footage is still arriving.

**`focus` matters here.** The footage is horizontal and the vertical cut
crops into it, so anything off-centre gets sliced. `focus: "38% 50%"`
holds the crop left of centre. It has no effect on the wide cut.

## Structure

30 frames = 1 second. The palette turn at shot 03 is the story beat — the
ride is warm stone, the room is oxygen blue. Keep that flip where it is
even if clips move around it.

- **0.0–4.9s** the ride
- **4.9–9.8s** the room
- **9.8–13.1s** the claim: the only one in the Benelux
- **13.1–17.7s** after
- **17.7–18.5s** the payoff
- **18.5–20.0s** end card

The composition's length is whatever the shots add up to, so changing one
duration never breaks the render — but the console warns when the cut has
drifted off the 20-second brief.

## Safe areas

Captions sit 360px clear of the bottom, out of the caption and CTA
furniture TikTok, Reels and Shorts overlay on the lower fifth. If a
platform still clips something, raise `captionBottom` for `vertical` in
`FORMATS`. The wide cut has its own, lower, safe area — a website has no
platform UI eating the frame.

## Rendering where Chromium already exists

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome npm run video:render
```
