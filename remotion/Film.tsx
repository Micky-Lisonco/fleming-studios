import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BRAND,
  CONFORMED,
  DEFAULT_FILM,
  FILMS,
  MUSIC,
  crossfadeFor,
  layoutFor,
  resolveMedia,
  speechRanges,
} from "./edit";
import type { Film as FilmDef } from "./edit";
import { EndCard } from "./components/EndCard";
import { TextCard } from "./components/TextCard";
import { ProgressBar } from "./components/ProgressBar";
import { Caption } from "./components/Caption";
import { Shot } from "./components/Shot";
import { Subtitles } from "./components/Subtitles";
import { Pop } from "./components/Pop";

/** Frames of lead-in and tail on the music duck, so it breathes. */
const DUCK_FADE = 6;

/**
 * Set by scripts/render-safe.mjs. That render mixes the voice and music
 * in itself, with the system ffmpeg, so the frames are drawn without
 * them: an <Audio> here, even in a muted render, has Remotion probe the
 * file with its bundled ffprobe.exe - the binary that crashes on the
 * Windows edit machine and that the safe render exists to avoid.
 */
const SAFE_RENDER =
  typeof process !== "undefined" && process.env?.REMOTION_BROWSER_VIDEO === "1";

/**
 * Loudness the voice plays at in the Studio. Lower than the delivered
 * -14 on purpose: the preview has no limiter, and the loudest lines peak
 * near full scale in the source.
 */
const PREVIEW_LUFS = -19;

/**
 * How far ahead of its own start each shot is mounted. Half a second is
 * plenty for a decoder to have the first frame ready, and premounted
 * sequences are invisible until their real start.
 */
const PREMOUNT = 12;

/**
 * One line of a film's on-screen copy, held across the cuts under it. It
 * brings its own backing: a soft navy gradient up from the bottom, only
 * while the line is up, instead of a scrim darkening every shot.
 */
const Title: React.FC<{
  text: string;
  sub?: string;
  durationInFrames: number;
  accent: string;
  fontFamily?: string;
  aboveSubtitles?: boolean;
}> = ({ text, sub, durationInFrames, accent, fontFamily, aboveSubtitles }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = layoutFor(width, height);
  // Two lines of subtitles and their backing, plus a gap.
  const raise = aboveSubtitles ? Math.round(layout.subSize * 1.1 * 1.35 * 2 + 56) : 0;
  const opacity = interpolate(frame, [0, 8, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: aboveSubtitles
            ? "linear-gradient(to top, rgba(11,30,61,0.62) 0%, rgba(11,30,61,0.42) 36%, rgba(11,30,61,0) 62%)"
            : "linear-gradient(to top, rgba(11,30,61,0.62) 0%, rgba(11,30,61,0.38) 24%, rgba(11,30,61,0) 46%)",
        }}
      />
      <Caption text={text} sub={sub} accent={accent} fontFamily={fontFamily} raise={raise} />
    </AbsoluteFill>
  );
};

export type FilmProps = {
  /** Which film to lay out. See FILMS in edit.ts. */
  filmId: string;
};

/**
 * Lays one film's shots on the timeline back to back. Every shot runs
 * `crossfade` frames long and the next fades in over that tail, so cuts
 * stay soft without the maths shifting when a duration changes.
 *
 * The brand film and the ad are different cuts, not one cut in two
 * crops, so each one brings its own shot list, its own words and its
 * own cutting energy.
 */
export const Film: React.FC<FilmProps> = ({ filmId }) => {
  const film: FilmDef = FILMS[filmId] ?? FILMS[DEFAULT_FILM];
  const crossfade = crossfadeFor(film);
  const calm = film.energy === "calm";
  const speech = speechRanges(film);
  const frame = useCurrentFrame();
  const total = film.shots.reduce((n, sh) => n + sh.durationInFrames, 0) +
    (film.endCard?.durationInFrames ?? 0);

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      {film.shots.map((shot, i) => {
        const from = cursor;
        cursor += shot.durationInFrames;
        const isLast = i === film.shots.length - 1;
        const words = film.captions[shot.id];
        const card = film.cards?.[shot.id];

        return (
          <Sequence
            key={shot.id}
            from={from}
            durationInFrames={shot.durationInFrames + (isLast ? 0 : crossfade)}
            // Mount the shot early so its video is decoded before it has
            // to be shown. Without this the first frames of a cut can
            // arrive empty, which is what a "black flash" between scenes
            // actually is.
            premountFor={PREMOUNT}
            name={`${String(i + 1).padStart(2, "0")} ${shot.id}`}
          >
            <Shot
              shot={shot}
              index={i}
              crossfade={crossfade}
              isFirst={i === 0}
              caption={words?.caption}
              sub={words?.sub}
              card={card}
              punch={shot.punch ?? !calm}
              plain={film.plain}
            />
          </Sequence>
        );
      })}

      {film.endCard ? (
        <Sequence
          from={cursor}
          durationInFrames={film.endCard.durationInFrames}
          name="End card"
        >
          <EndCard endCard={film.endCard} />
        </Sequence>
      ) : null}

      {/* Text beats that span several shots. Above the footage, below
          the loop fade. */}
      {(film.overlays ?? []).map((ov, i) => (
        <Sequence
          key={`overlay-${i}`}
          from={ov.from}
          durationInFrames={ov.durationInFrames}
          name={`Text: ${ov.card.title}`}
        >
          <TextCard
            card={ov.card}
            accent={film.endCard?.accent ?? BRAND.oxygen}
            durationInFrames={ov.durationInFrames}
          />
        </Sequence>
      ))}

      {film.endCard ? <ProgressBar accent={film.endCard.accent ?? BRAND.oxygen} /> : null}

      {/* Fades both ends to black so a looping header joins invisibly. */}
      {film.loopFade ? (
        <AbsoluteFill
          style={{
            backgroundColor: "#000",
            pointerEvents: "none",
            opacity: interpolate(
              frame,
              [0, film.loopFade, total - film.loopFade, total],
              [1, 0, 0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        />
      ) : null}

      {(film.titles ?? []).map((t, i) => (
        <Sequence
          key={`title-${i}`}
          from={t.from}
          durationInFrames={t.to - t.from}
          name={`Title: ${t.text}`}
        >
          <Title
            text={t.text}
            sub={t.sub}
            durationInFrames={t.to - t.from}
            accent={film.endCard?.accent ?? BRAND.oxygen}
            fontFamily={film.font}
            aboveSubtitles={t.aboveSubtitles}
          />
        </Sequence>
      ))}

      {/* Burned in: most of Meta and TikTok plays muted. Timed to the
          voice track, over the footage and the end card. */}
      {film.subtitles?.length ? (
        <Subtitles
          lines={film.subtitles}
          accent={film.endCard?.accent ?? BRAND.oxygen}
          fontFamily={film.font}
        />
      ) : null}

      {(film.pops ?? []).map((p, i) => (
        <Sequence key={`pop-${i}`} from={p.from} durationInFrames={p.to - p.from} name={`Pop: ${p.text}`}>
          <Pop pop={p} fontFamily={film.font} outline={film.endCard?.ink ?? BRAND.black} />
        </Sequence>
      ))}

      {/* The voice track. A conformed clip is already cut to its range and
          levelled; a proxy is the whole source, so seek into it and level
          it here. Only in the Studio: the safe render leaves it out and
          mixes the same ranges itself, with ffmpeg. */}
      {(SAFE_RENDER ? [] : film.voice ?? []).map((v) => (
        <Sequence
          key={v.id}
          from={v.from}
          durationInFrames={v.durationInFrames}
          name={`Voice: ${v.id}`}
        >
          <Audio
            src={staticFile(
              v.generated
                ? `${v.project ? `${v.project}/` : ""}generated/${v.file}`
                : resolveMedia(CONFORMED ? `${v.id}.m4a` : v.file, v.project),
            )}
            startFrom={CONFORMED && !v.generated ? 0 : v.startFrom}
            volume={(f) =>
              interpolate(f, [0, 1, v.durationInFrames - 2, v.durationInFrames], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) * (CONFORMED && !v.generated ? 1 : 10 ** ((PREVIEW_LUFS - v.lufs) / 20))
            }
            // A quiet line needs a gain above 1, which a plain <audio>
            // element cannot play.
            useWebAudioApi
          />
        </Sequence>
      ))}

      {MUSIC.file && !SAFE_RENDER ? (
        <Audio
          src={staticFile(resolveMedia(MUSIC.file))}
          startFrom={MUSIC.startFrom}
          // Ducks under any shot carrying its own sound. Nothing does
          // today, but a voiceover laid in later gets this for free.
          volume={(f) =>
            speech.some(([a, b]) => f >= a - DUCK_FADE && f < b + DUCK_FADE)
              ? MUSIC.duckedVolume
              : MUSIC.volume
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
