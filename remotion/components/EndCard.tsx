import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, END_CARD } from "../edit";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        backgroundColor: BRAND.black,
        alignItems: "center",
        justifyContent: "center",
        opacity,
        fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, ${END_CARD.accent}26 0%, rgba(0,0,0,0) 58%)`,
        }}
      />

      {/*
        Logo and type are siblings, not children of one scaled wrapper: a
        transform on a shared parent would isolate the logo's blend mode
        from the glow painted behind it, and supplied logos are often a
        JPEG on a solid black box that needs to blend away.
      */}
      {END_CARD.logo ? (
        <Img
          src={staticFile(END_CARD.logo)}
          style={{
            width: 560,
            objectFit: "contain",
            transform: `scale(${scale})`,
            mixBlendMode: "screen",
          }}
        />
      ) : (
        <div
          style={{
            transform: `scale(${scale})`,
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: BRAND.white,
          }}
        >
          {END_CARD.wordmark}
        </div>
      )}

      {END_CARD.line ? (
        <div
          style={{
            marginTop: 20,
            transform: `scale(${scale})`,
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: END_CARD.accent,
            textTransform: "uppercase",
          }}
        >
          {END_CARD.line}
        </div>
      ) : null}

      {END_CARD.venue ? (
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
          {END_CARD.venue}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          bottom: 420,
          opacity: ctaIn,
          transform: `translateY(${interpolate(ctaIn, [0, 1], [20, 0])}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "26px 56px",
            border: `3px solid ${END_CARD.accent}`,
            borderRadius: 999,
            color: END_CARD.accent,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "0.06em",
            boxShadow: `0 0 50px ${END_CARD.accent}55`,
          }}
        >
          {END_CARD.cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
