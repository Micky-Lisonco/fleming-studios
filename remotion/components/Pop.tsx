import { Fragment } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { layoutFor } from "../edit";
import type { PopText } from "../edit";

const BLUE = "#2563c7";

/**
 * On-screen text for the bloopers, done the way Reels and TikTok captions
 * are done now: heavy white type (Nunito Black, the brand face) with a
 * soft shadow, no outlines, no boxes. Words spring up into place out of a
 * blur, one after another. Words listed in `highlight` get a brand-blue
 * pill that sweeps in behind them once they have landed.
 *
 * `letters` staggers the letters instead of the words (for a single word
 * like the opening title), and `glitch` gives it two quick colour-split
 * flickers, like a camera glitching - it is a bloopers reel.
 */
export const Pop: React.FC<{ pop: PopText; fontFamily?: string }> = ({ pop, fontFamily }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = layoutFor(width, height);
  const duration = pop.to - pop.from;
  const size = Math.round(width * (pop.size ?? 0.1));
  const step = pop.beat ?? 3;
  const units = pop.letters ? [...pop.text] : pop.text.split(" ");
  const highlight = new Set(pop.highlight ?? []);

  const out = interpolate(frame, [duration - 5, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Two 2-frame flickers, early on.
  const glitching = pop.glitch && ((frame >= 9 && frame < 11) || (frame >= 15 && frame < 17));
  const split = glitching ? Math.round(size * 0.06) : 0;

  return (
    <>
      {pop.shade ? (
        // A soft darkening rising from the bottom of the frame, so the
        // words read without a block behind them.
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: interpolate(frame, [0, 8, duration - 5, duration], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background:
              "linear-gradient(to top, rgba(11,30,61,0.78) 0%, rgba(11,30,61,0.55) 32%, rgba(11,30,61,0) 58%)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          // Bigger closing lines may use nearly the full width.
          left: pop.wide ? width * 0.035 : layout.sidePad,
          right: pop.wide ? width * 0.035 : layout.sidePad,
          top: height * (pop.y ?? 0.2),
          textAlign: "center",
          textWrap: "balance",
          whiteSpace: pop.letters ? "nowrap" : undefined,
          fontFamily,
          fontSize: size,
          lineHeight: 1.16,
          pointerEvents: "none",
          opacity: out,
          transform: glitching ? `translateX(${split * 0.6}px) skewX(-6deg)` : undefined,
        }}
      >
        {units.map((u, i) => {
          const local = frame - i * step;
          const s = spring({ frame: local, fps, config: { damping: 14, mass: 0.5, stiffness: 170 } });
          const y = interpolate(s, [0, 1], [0.45, 0]);
          const blur = interpolate(local, [0, 6], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const appear = interpolate(local, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const key = u.replace(/[.,!?]/g, "");
          const pill = highlight.has(key)
            ? interpolate(local, [5, 11], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 0;
          // "|" in the text is a forced line break.
          if (u === "|") return <br key={i} />;
          return (
            <Fragment key={i}>
              {i && !pop.letters && units[i - 1] !== "|" ? " " : null}
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  fontWeight: 900,
                  letterSpacing: "-0.015em",
                  color: "#ffffff",
                  opacity: appear,
                  transform: `translateY(${y}em)`,
                  filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                  textShadow: glitching
                    ? `${-split}px 0 rgba(255,40,80,0.85), ${split}px 0 rgba(40,200,255,0.85)`
                    : `0 ${Math.round(size * 0.05)}px ${Math.round(size * 0.22)}px rgba(4,14,30,0.55)${
                        pop.glow ? `, 0 0 ${Math.round(size * 0.35)}px rgba(37,99,199,0.9)` : ""
                      }`,
                  // Room for the pill from the start, so nothing shifts when it arrives.
                  padding: highlight.has(key) ? "0 0.14em" : undefined,
                  margin: highlight.has(key) ? "0 -0.04em" : undefined,
                  isolation: "isolate",
                }}
              >
                {pill ? (
                  <span
                    style={{
                      position: "absolute",
                      inset: "0.06em 0 0.02em 0",
                      background: BLUE,
                      borderRadius: "0.18em",
                      transform: `scaleX(${pill})`,
                      transformOrigin: "left center",
                      zIndex: -1,
                      boxShadow: "0 0.08em 0.3em rgba(4,14,30,0.35)",
                    }}
                  />
                ) : null}
                {u}
              </span>
            </Fragment>
          );
        })}
      </div>
    </>
  );
};
