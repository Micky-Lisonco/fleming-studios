import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { layoutFor } from "../edit";
import type { PopText } from "../edit";

/**
 * Loud on-screen text for the bloopers, in the brand: the brand typeface,
 * straight, on solid blocks of the brand colours. No outline, no tilt, no
 * slow zoom.
 *
 * With `beat` the words land one at a time, every `beat` frames, each with
 * a hard 3-frame punch and a jolt of the whole line: a statement, word by
 * word. Each word carries its own block, so the band grows as they land.
 * With `flash` the text blinks a few times before it holds.
 */
export const Pop: React.FC<{ pop: PopText; fontFamily?: string }> = ({ pop, fontFamily }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = layoutFor(width, height);
  const duration = pop.to - pop.from;
  const words = pop.text.split(" ");
  const beat = pop.beat ?? 0;

  const shown = beat ? Math.min(words.length, Math.floor(frame / beat) + 1) : words.length;
  // Frames since the latest word landed (or since the start).
  const since = beat ? frame - (shown - 1) * beat : frame;
  const jolt = since < 3 ? [0, -0.012, 0.006][since] * height : 0;

  const blink = pop.flash && frame < 18 && Math.floor(frame / 3) % 2 === 1 ? 0 : 1;
  const out = interpolate(frame, [duration - 3, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const size = Math.round(width * (pop.size ?? 0.12));
  const block = pop.background ?? "#0b1e3d";

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
        transform: `translateY(${jolt}px)`,
        lineHeight: 1.18,
      }}
    >
      {words.map((w, i) => {
        const age = beat ? frame - i * beat : frame;
        const visible = i < shown;
        // A hard punch, not a zoom: two frames big, then home.
        const punch = age < 0 ? 1 : age === 0 ? 1.28 : age === 1 ? 1.1 : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              visibility: visible ? "visible" : "hidden",
              transform: `scale(${punch})`,
              fontFamily,
              fontWeight: 800,
              fontSize: size,
              letterSpacing: "-0.01em",
              color: pop.color ?? "#ffffff",
              background: block,
              // Square, and butted up against each other, so the blocks
              // join into one band per line without seams.
              padding: `${Math.round(size * 0.06)}px ${Math.round(size * 0.16)}px`,
              margin: `${Math.round(size * 0.04)}px 0`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
