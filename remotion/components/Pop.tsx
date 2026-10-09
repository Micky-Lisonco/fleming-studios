import { Fragment } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { layoutFor } from "../edit";
import type { PopText } from "../edit";

/**
 * Loud on-screen text for the bloopers, in the brand: white in the brand
 * typeface with an edge of a brand colour around the letters, straight,
 * no blocks behind it. Where it needs help to read, `band` lays a soft
 * see-through navy band across the frame behind it, fading out at the
 * top and bottom, rather than a solid box.
 *
 * With `beat` the words land one at a time, every `beat` frames, each with
 * a hard 2-frame punch and a jolt of the whole line. With `flash` the text
 * blinks a few times before it holds.
 */
export const Pop: React.FC<{ pop: PopText; fontFamily?: string }> = ({ pop, fontFamily }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = layoutFor(width, height);
  const duration = pop.to - pop.from;
  const words = pop.text.split(" ");
  const beat = pop.beat ?? 0;

  const shown = beat ? Math.min(words.length, Math.floor(frame / beat) + 1) : words.length;
  const since = beat ? frame - (shown - 1) * beat : frame;
  const jolt = since < 3 ? [0, -0.01, 0.005][since] * height : 0;

  const blink = pop.flash && frame < 18 && Math.floor(frame / 3) % 2 === 1 ? 0 : 1;
  const out = interpolate(frame, [duration - 3, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const size = Math.round(width * (pop.size ?? 0.12));
  const edge = pop.edge ?? "#2563c7";
  const stroke = Math.max(3, Math.round(size * 0.09));

  return (
    <>
      {pop.band ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * pop.band[0],
            height: height * pop.band[1],
            pointerEvents: "none",
            opacity: interpolate(frame, [0, 4, duration - 3, duration], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background:
              "linear-gradient(to bottom, rgba(11,30,61,0) 0%, rgba(11,30,61,0.5) 22%, rgba(11,30,61,0.5) 78%, rgba(11,30,61,0) 100%)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: layout.sidePad,
          right: layout.sidePad,
          top: height * (pop.y ?? 0.2),
          textAlign: "center",
          textWrap: "balance",
          fontSize: size,
          fontFamily,
          pointerEvents: "none",
          opacity: blink * out,
          transform: `translateY(${jolt}px)`,
          lineHeight: 1.12,
        }}
      >
        {words.map((w, i) => {
          const age = beat ? frame - i * beat : frame;
          // A hard punch, not a zoom: two frames big, then home.
          const punch = age === 0 ? 1.25 : age === 1 ? 1.08 : 1;
          return (
            <Fragment key={i}>
            {i ? " " : null}
            <span
              style={{
                display: "inline-block",
                visibility: i < shown ? "visible" : "hidden",
                transform: `scale(${punch})`,
                fontFamily,
                fontWeight: 800,
                fontSize: size,
                letterSpacing: "-0.01em",
                color: pop.color ?? "#ffffff",
                WebkitTextStroke: `${stroke}px ${edge}`,
                paintOrder: "stroke fill",
                textShadow: `0 ${Math.round(stroke * 0.8)}px ${stroke * 2}px rgba(11,30,61,0.45)`,
              }}
            >
              {w}
            </span>
            </Fragment>
          );
        })}
      </div>
    </>
  );
};
