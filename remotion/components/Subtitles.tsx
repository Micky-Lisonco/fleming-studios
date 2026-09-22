import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, layoutFor } from "../edit";
import type { Subtitle } from "../edit";

/**
 * Burned-in subtitles for a soundbite.
 *
 * Not a nicety: most of Meta and TikTok plays muted, so an unsubtitled
 * answer is just a silent shot of someone's face. They sit lower and
 * smaller than a poster caption, on their own scrim, so a line of speech
 * never gets mistaken for the headline.
 */
export const Subtitles: React.FC<{ lines: Subtitle[]; accent: string }> = ({
  lines,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = layoutFor(width, height);

  const line = lines.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;

  // Short fade so lines replace each other cleanly rather than snapping.
  const opacity = interpolate(
    frame,
    [line.from, line.from + 3, line.to - 3, line.to],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: layout.sidePad,
        right: layout.sidePad,
        // Same safe area as a poster caption. Sitting any lower puts the
        // words behind the platform's own UI, which is the one thing a
        // subtitle cannot afford — a soundbite nobody can read is a silent
        // shot of a face.
        bottom: layout.captionBottom,
        opacity,
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "inline",
          fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
          fontSize: Math.round(layout.subSize * 1.1),
          fontWeight: 700,
          lineHeight: 1.35,
          color: BRAND.white,
          letterSpacing: "-0.01em",
          // Painted behind the words themselves rather than as a block, so
          // short lines do not sit on an oversized slab.
          background: "rgba(0,0,0,0.62)",
          boxShadow: "0 0 0 12px rgba(0,0,0,0.62)",
          borderBottom: `4px solid ${accent}`,
          // Without this a line that wraps gets one scrim stretched behind
          // both rows instead of one per row.
          WebkitBoxDecorationBreak: "clone",
          boxDecorationBreak: "clone",
        }}
      >
        {line.text}
      </span>
    </div>
  );
};
