import { AbsoluteFill } from "remotion";
import { BRAND } from "../edit";

/** Vignette and bottom scrim, so type always reads over any footage. */
export const Overlay: React.FC<{ accent: string }> = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: `linear-gradient(to top, ${BRAND.black} 0%, rgba(0,0,0,0.55) 18%, rgba(0,0,0,0) 42%)`,
      }}
    />
  </AbsoluteFill>
);
