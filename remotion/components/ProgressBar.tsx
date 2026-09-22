import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Hairline that fills over the full 20 seconds. Lives at the top level
 * of the composition so it reads absolute frames, not shot-relative ones.
 */
export const ProgressBar: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 6,
        width: `${progress}%`,
        background: accent,
        boxShadow: `0 0 24px ${accent}`,
      }}
    />
  );
};
