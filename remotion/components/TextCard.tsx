import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, layoutFor } from "../edit";
import { fitFontSize } from "./fitText";

export type Card = {
  /** Small line above the headline. */
  kicker?: string;
  title: string;
  /** Supporting line below. Keep it to one breath. */
  body?: string;
};

/**
 * A full-frame text beat over the footage.
 *
 * Different job from Caption: a caption decorates a shot, this one IS
 * the shot's content and the picture behind it is atmosphere. So it
 * sits centre, carries a scrim heavy enough to guarantee contrast over
 * anything, and gets long enough on screen to actually be read - about
 * three and a half seconds for a headline and a line of body.
 *
 * Built for the explainer cut, where someone who has never heard of a
 * zuurstofkamer has to understand what it is, why it exists and who it
 * is for, inside twenty seconds and with the sound off.
 */
export const TextCard: React.FC<{ card: Card; accent: string; durationInFrames: number }> = ({
  card,
  accent,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = layoutFor(width, height);

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.5 } });
  const y = interpolate(enter, [0, 1], [28, 0]);

  // Holds, then leaves before the cut so the next card never collides
  // with this one.
  const opacity = interpolate(
    frame,
    [0, 6, durationInFrames - 8, durationInFrames - 2],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scrim = interpolate(frame, [0, 8], [0, 0.62], { extrapolateRight: "clamp" });

  const available = width - layout.sidePad * 2;
  const titleSize = fitFontSize(card.title, available, layout.captionSize, {
    fontWeight: 800,
    letterSpacing: "-0.035em",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: `rgba(4,18,26,${scrim})` }} />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: `0 ${layout.sidePad}px`,
          textAlign: "center",
          opacity,
          transform: `translateY(${y}px)`,
          fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
        }}
      >
        {card.kicker ? (
          <div
            style={{
              fontSize: Math.round(layout.subSize * 0.8),
              fontWeight: 700,
              letterSpacing: "0.24em",
              color: accent,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {card.kicker}
          </div>
        ) : null}

        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.035em",
            color: BRAND.white,
            textTransform: "uppercase",
            textShadow: "0 8px 50px rgba(0,0,0,0.6)",
            // The measured fit should make this unreachable; it is here
            // so a font that fails to load can never bleed off frame.
            overflowWrap: "anywhere",
          }}
        >
          {card.title}
        </div>

        {card.body ? (
          <div
            style={{
              marginTop: 26,
              maxWidth: "88%",
              fontSize: layout.subSize,
              fontWeight: 500,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            {card.body}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 30,
            width: 84,
            height: 6,
            background: accent,
            boxShadow: `0 0 26px ${accent}`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
