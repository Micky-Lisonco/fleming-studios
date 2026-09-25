import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, END_CARD, layoutFor } from "../edit";
import type { Film } from "../edit";

export const EndCard: React.FC<{ endCard: NonNullable<Film["endCard"]> }> = ({ endCard }) => {
  const frame = useCurrentFrame();
  // Each film can carry its own brand; unset falls back to Cobblestone.
  const accent = endCard.accent ?? END_CARD.accent;
  const logo = endCard.logo !== undefined ? endCard.logo : END_CARD.logo;
  const background = endCard.background ?? BRAND.black;
  const font = endCard.fontFamily ?? "system-ui, -apple-system, Helvetica, sans-serif";
  const { fps, width, height } = useVideoConfig();
  const layout = layoutFor(width, height);

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const scale = interpolate(enter, [0, 1], [0.88, 1]);
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const ctaIn = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
        opacity,
        fontFamily: font,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, ${accent}26 0%, rgba(0,0,0,0) 58%)`,
        }}
      />

      {/*
        Logo and type are siblings, not children of one scaled wrapper: a
        transform on a shared parent would isolate the logo's blend mode
        from the glow painted behind it, and supplied logos are often a
        JPEG on a solid black box that needs to blend away.
      */}
      {logo ? (
        <Img
          src={staticFile(logo)}
          style={{
            width: layout.logoWidth,
            objectFit: "contain",
            transform: `scale(${scale})`,
            mixBlendMode: endCard.logoBlend ?? "screen",
          }}
        />
      ) : (
        <div
          style={{
            transform: `scale(${scale})`,
            fontSize: layout.wordmarkSize,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: BRAND.white,
          }}
        >
          {endCard.wordmark}
        </div>
      )}

      {endCard.line ? (
        <div
          style={{
            marginTop: 20,
            transform: `scale(${scale})`,
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: accent,
            textTransform: "uppercase",
          }}
        >
          {endCard.line}
        </div>
      ) : null}

      {endCard.venue ? (
        <div
          style={{
            marginTop: 40,
            transform: `scale(${scale})`,
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          {endCard.venue}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          bottom: layout.captionBottom + 60,
          opacity: ctaIn,
          transform: `translateY(${interpolate(ctaIn, [0, 1], [20, 0])}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "26px 56px",
            border: `3px solid ${accent}`,
            borderRadius: 999,
            color: accent,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "0.06em",
            boxShadow: `0 0 50px ${accent}55`,
          }}
        >
          {endCard.cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
