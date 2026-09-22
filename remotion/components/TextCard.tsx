import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, layoutFor } from "../edit";
import { FONT_FAMILY, fitFontSize } from "./fitText";

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
 * the shot's content and the picture behind it is atmosphere.
 *
 * Anchored to the LOWER part of the frame, not the centre. Centred text
 * lands squarely on the face of whoever is on camera, and the face is
 * the most valuable thing in the shot. Sitting it low also matches
 * where people already expect burned-in text in a feed.
 *
 * The scrim is a gradient rising from the bottom rather than a flat
 * wash, so the picture stays bright where nothing is written.
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

  // Fades out as well as in. Holding it flat to the last frame meant it
  // vanished instantly when the beat ended, which reads as a flicker
  // between beats even though the picture underneath never cut.
  const scrim = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames - 1],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const available = width - layout.sidePad * 2;
  // Up to three lines. A headline that wraps at full size beats one
  // that shrinks to fit, every time.
  const titleSize = fitFontSize(card.title, available, layout.captionSize, {
    fontWeight: 800,
    letterSpacing: "-0.035em",
    maxLines: 3,
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Gradient, not a flat wash: dark where the words are, clear
          where the picture is doing the work. */}
      <AbsoluteFill
        style={{
          opacity: scrim,
          background:
            "linear-gradient(to top, rgba(4,18,26,0.92) 0%, rgba(4,18,26,0.86) 30%, rgba(4,18,26,0.45) 52%, rgba(4,18,26,0) 70%)",
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          padding: `0 ${layout.sidePad}px ${layout.captionBottom}px`,
          textAlign: "center",
          opacity,
          transform: `translateY(${y}px)`,
          fontFamily: FONT_FAMILY,
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
              marginBottom: 16,
            }}
          >
            {card.kicker}
          </div>
        ) : null}

        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 0.92,
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
            marginTop: 26,
            width: 110,
            height: 8,
            background: accent,
            boxShadow: `0 0 26px ${accent}`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
