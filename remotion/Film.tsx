import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
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
import { ProgressBar } from "./components/ProgressBar";
import { Shot } from "./components/Shot";

/** Frames of lead-in and tail on the music duck, so it breathes. */
const DUCK_FADE = 6;

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

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      {film.shots.map((shot, i) => {
        const from = cursor;
        cursor += shot.durationInFrames;
        const isLast = i === film.shots.length - 1;
        const words = film.captions[shot.id];

        return (
          <Sequence
            key={shot.id}
            from={from}
            durationInFrames={shot.durationInFrames + (isLast ? 0 : crossfade)}
            name={`${String(i + 1).padStart(2, "0")} ${shot.id}`}
          >
            <Shot
              shot={shot}
              index={i}
              crossfade={crossfade}
              isFirst={i === 0}
              caption={words?.caption}
              sub={words?.sub}
              punch={!calm}
            />
          </Sequence>
        );
      })}

      <Sequence
        from={cursor}
        durationInFrames={film.endCard.durationInFrames}
        name="End card"
      >
        <EndCard endCard={film.endCard} />
      </Sequence>

      <ProgressBar accent={BRAND.oxygen} />

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
