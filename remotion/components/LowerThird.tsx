import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, SPEAKERS, layoutFor } from "../edit";

/**
 * Name super. Shown once, the first time someone speaks — after that the
 * audience knows who she is and a repeat just eats the frame.
 */
export const LowerThird: React.FC<{ speaker: string; accent: string }> = ({
  speaker,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = layoutFor(width, height);

  const person = SPEAKERS[speaker];
  if (!person) return null;

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.5 } });
  const x = interpolate(enter, [0, 1], [-40, 0]);
  // Holds for two seconds, then leaves.
  const out = interpolate(frame, [fps * 2, fps * 2 + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: layout.sidePad,
        bottom: Math.round(layout.captionBottom * 1.6),
        transform: `translateX(${x}px)`,
        opacity: Math.min(enter, out),
        borderLeft: `6px solid ${accent}`,
        paddingLeft: 24,
        fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: Math.round(layout.subSize * 1.15),
          fontWeight: 800,
          color: BRAND.white,
          letterSpacing: "-0.01em",
        }}
      >
        {person.name}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: Math.round(layout.subSize * 0.8),
          fontWeight: 500,
          color: "rgba(255,255,255,0.72)",
        }}
      >
        {person.role}
      </div>
    </div>
  );
};
