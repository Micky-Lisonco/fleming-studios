import { Composition } from "remotion";
import { FILMS, FORMATS, FPS, TARGET_FRAMES, filmFrames } from "./edit";
import { Film } from "./Film";

/**
 * One composition per film. They are separate cuts with separate shot
 * lists, so each carries its own length and its own shape.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {Object.values(FILMS).map((film) => {
      const layout = FORMATS[film.format];
      const frames = filmFrames(film);

      if (frames !== TARGET_FRAMES) {
        // eslint-disable-next-line no-console
        console.warn(
          `[${film.id}] is ${(frames / FPS).toFixed(2)}s, brief is ${TARGET_FRAMES / FPS}s ` +
            `(${frames - TARGET_FRAMES > 0 ? "+" : ""}${frames - TARGET_FRAMES} frames).`
        );
      }

      return (
        <Composition
          key={film.id}
          id={film.id}
          component={Film}
          defaultProps={{ filmId: film.id }}
          durationInFrames={frames}
          fps={FPS}
          width={layout.width}
          height={layout.height}
        />
      );
    })}
  </>
);
