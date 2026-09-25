import { Composition } from "remotion";
import { FILMS, FORMATS, FPS, TARGET_FRAMES, filmFrames } from "./edit";
import { Film } from "./Film";
// Loads Elite Cleaning's Nunito for the end card. Imported here, where the
// video is drawn, rather than in edit.ts - edit.ts is also read by the
// cut export in plain Node, which has no browser to load a font into.
import "./fonts";

/**
 * One composition per film. They are separate cuts with separate shot
 * lists, so each carries its own length and its own shape.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {Object.values(FILMS).map((film) => {
      const layout = FORMATS[film.format];
      const frames = filmFrames(film);

      const target = film.targetFrames ?? TARGET_FRAMES;
      if (frames !== target) {
        // eslint-disable-next-line no-console
        console.warn(
          `[${film.id}] is ${(frames / FPS).toFixed(2)}s, brief is ${target / FPS}s ` +
            `(${frames - target > 0 ? "+" : ""}${frames - target} frames).`
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
