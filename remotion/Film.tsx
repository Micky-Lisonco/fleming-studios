import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  BRAND,
  DEFAULT_FILM,
  FILMS,
  MUSIC,
  crossfadeFor,
  resolveMedia,
  speechRanges,
} from "./edit";
import type { Film as FilmDef } from "./edit";
import { EndCard } from "./components/EndCard";
import { TextCard } from "./components/TextCard";
import { ProgressBar } from "./components/ProgressBar";
import { Shot } from "./components/Shot";

/** Frames of lead-in and tail on the music duck, so it breathes. */
const DUCK_FADE = 6;

/**
 * How far ahead of its own start each shot is mounted. Half a second is
 * plenty for a decoder to have the first frame ready, and premounted
 * sequences are invisible until their real start.
 */
const PREMOUNT = 12;

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
              punch={!calm}
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

      {MUSIC.file ? (
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
