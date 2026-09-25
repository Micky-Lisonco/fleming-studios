import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, layoutFor } from "../edit";
import { FONT_FAMILY, fitFontSize } from "./fitText";

/**
 * Minimum height of the text block, as a fraction of frame height.
 * Content is centred inside it, so a short card is lifted off the
 * bottom rather than sitting on it. A card taller than this simply
 * grows upward.
 */
const MIN_BLOCK_HEIGHT = 0.34;

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
 * The block's BOTTOM edge is pinned clear of the frame bottom, and it
 * grows upward from there. It also carries a minimum height with its
 * content centred inside, so a short two-line card sits well up the
 * frame instead of on the floor.
 *
 * Both halves matter. A fixed band with centred content looked right
 * for short cards and pushed long ones off the bottom of the screen -
 * text centred in a box overflows equally at both ends, and the end
 * that matters is the one being cut off. Growing upward from a pinned
 * bottom edge cannot overflow downward at all.
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

      <div
        style={{
          position: "absolute",
          left: layout.sidePad,
          right: layout.sidePad,
          // Pinned bottom: whatever the card says, it cannot run off the
          // bottom of the screen.
          bottom: layout.captionBottom * 0.68,
          minHeight: height * MIN_BLOCK_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
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
            // Even lines, no stranded "EEN" between two long ones.
            textWrap: "balance",
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
      </div>
    </AbsoluteFill>
  );
};
