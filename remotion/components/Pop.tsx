import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { layoutFor } from "../edit";
import type { PopText } from "../edit";

/**
 * Loud on-screen text for the bloopers: big, tilted, outlined, and it
 * lands with an overshoot. With `flash` it blinks a few times before it
 * settles, like a sign switching on. Sits high in the frame, clear of
 * the subtitles at the bottom.
 */
export const Pop: React.FC<{ pop: PopText; fontFamily?: string; outline: string }> = ({
  pop,
  fontFamily,
  outline,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = layoutFor(width, height);
  const duration = pop.to - pop.from;

  const land = spring({ frame, fps, config: { damping: 9, mass: 0.6, stiffness: 180 } });
  const scale = interpolate(land, [0, 1], [2.2, 1]);
  // Off on every other 3-frame step for the first 18 frames, then steady.
  const blink = pop.flash && frame < 18 && Math.floor(frame / 3) % 2 === 1 ? 0.15 : 1;
  const out = interpolate(frame, [duration - 4, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // A small shake while it lands, gone once it has.
  const shake = frame < 10 ? Math.sin(frame * 2.3) * (10 - frame) * 0.8 : 0;

  const size = Math.round(width * (pop.size ?? 0.16));
  const stroke = Math.max(4, Math.round(size * 0.07));

  return (
    <div
      style={{
        position: "absolute",
        left: layout.sidePad,
        right: layout.sidePad,
        top: height * (pop.y ?? 0.2),
        textAlign: "center",
        textWrap: "balance",
        pointerEvents: "none",
        opacity: blink * out,
        transform: `translateX(${shake}px) rotate(${pop.tilt ?? -4}deg) scale(${scale})`,
      }}
    >
      <span
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: pop.color ?? "#ffffff",
          WebkitTextStroke: `${stroke}px ${outline}`,
          paintOrder: "stroke fill",
          textShadow: `0 ${Math.round(stroke * 1.2)}px 0 ${outline}, 0 0 ${stroke * 6}px rgba(0,0,0,0.35)`,
        }}
      >
        {pop.text}
      </span>
    </div>
  );
};
