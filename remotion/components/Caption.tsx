import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../edit";

/**
 * Lower-third type. Sits clear of the bottom ~18% where TikTok and
 * Reels put their own UI, so nothing important gets covered.
 */
export const Caption: React.FC<{
  text: string;
  sub?: string;
  accent: string;
}> = ({ text, sub, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.6 } });
  const y = interpolate(enter, [0, 1], [40, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 360,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      <div
        style={{
          width: 96,
          height: 8,
          background: accent,
          boxShadow: `0 0 28px ${accent}`,
          marginBottom: 28,
        }}
      />
      <div
        style={{
          fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
          fontSize: text.length > 14 ? 104 : 128,
          lineHeight: 0.92,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: BRAND.white,
          textShadow: "0 8px 60px rgba(0,0,0,0.85)",
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 24,
            fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: "rgba(255,255,255,0.78)",
            textShadow: "0 4px 30px rgba(0,0,0,0.8)",
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};
