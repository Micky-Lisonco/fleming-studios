import { Composition } from "remotion";
import { FPS, HEIGHT, TARGET_FRAMES, TOTAL_FRAMES, WIDTH } from "./edit";
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

export const RemotionRoot: React.FC = () => (
  <Composition
    id="VerticalAd"
    component={VerticalAd}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
