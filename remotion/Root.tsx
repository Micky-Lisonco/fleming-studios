import { Composition } from "remotion";
import { FORMATS, FPS, TARGET_FRAMES, TOTAL_FRAMES, VARIANTS } from "./edit";
import { VerticalAd } from "./VerticalAd";

if (TOTAL_FRAMES !== TARGET_FRAMES) {
  // Not fatal — the composition always matches whatever the edit adds up to.
  // This just flags when the cut has drifted off the 20-second brief.
  // eslint-disable-next-line no-console
  console.warn(
    `[edit] Cut is ${(TOTAL_FRAMES / FPS).toFixed(2)}s, brief is ${TARGET_FRAMES / FPS}s ` +
      `(${TOTAL_FRAMES - TARGET_FRAMES > 0 ? "+" : ""}${TOTAL_FRAMES - TARGET_FRAMES} frames).`
  );
}

/**
 * One composition per campaign per format. They all share a single
 * timeline, so a change to the cut lands everywhere at once and the
 * versions cannot drift apart.
 *
 * Ids read as `<variant>` for vertical and `<variant>-wide` for the
 * website cut, e.g. `sporter-nl` and `sporter-nl-wide`.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {Object.values(VARIANTS).flatMap((variant) =>
      (["vertical", "wide"] as const).map((format) => {
        const layout = FORMATS[format];
        return (
          <Composition
            key={`${variant.id}-${format}`}
            id={format === "wide" ? `${variant.id}-wide` : variant.id}
            component={VerticalAd}
            defaultProps={{ variantId: variant.id }}
            durationInFrames={TOTAL_FRAMES}
            fps={FPS}
            width={layout.width}
            height={layout.height}
          />
        );
      })
    )}
  </>
);
