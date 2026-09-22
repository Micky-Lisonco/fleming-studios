import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Shot as ShotType } from "../edit";
import { BRAND, CONFORMED, resolveMedia, shotSource, shotStartFrom } from "../edit";
import { Caption } from "./Caption";
import { LowerThird } from "./LowerThird";
import { Subtitles } from "./Subtitles";
import { Overlay } from "./Overlay";

/**
 * Stands in for a file that has not arrived yet, so the edit always
 * plays end to end and you can judge the pacing before the footage
 * is cut in.
 */
const Placeholder: React.FC<{ shot: ShotType; index: number }> = ({ shot, index }) => {
  const accent = shot.accent ?? BRAND.oxygen;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(150deg, #0a0a0a 0%, #000 60%)`,
        border: `4px dashed ${accent}55`,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, Helvetica, sans-serif",
        color: accent,
      }}
    >
      <div style={{ fontSize: 220, fontWeight: 800, letterSpacing: "-0.05em", opacity: 0.35 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ fontSize: 34, letterSpacing: "0.32em", opacity: 0.8, marginTop: 8 }}>
        AWAITING FOOTAGE
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 28,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {CONFORMED ? resolveMedia(`${shot.id}.mp4`) : resolveMedia(shot.file ?? `${shot.id}.mp4`)}
      </div>
    </AbsoluteFill>
  );
};

export const Shot: React.FC<{
  shot: ShotType;
  index: number;
  /** Frames of fade-in at the head of this shot. */
  crossfade: number;
  isFirst: boolean;
  /** Words for this shot, supplied by the active campaign variant. */
  caption?: string;
  sub?: string;
  punch: boolean;
}> = ({ shot, index, crossfade, isFirst, caption, sub, punch: punchOn }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = shot.accent ?? BRAND.oxygen;

  const opacity = isFirst
    ? 1
    : interpolate(frame, [0, crossfade], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // Slow push-in. On by default for stills so they never feel frozen.
  const kenBurns = shot.kenBurns ?? shot.kind === "image";
  const drift = kenBurns
    ? interpolate(frame, [0, shot.durationInFrames], [1, 1.12], {
        extrapolateRight: "clamp",
      })
    : 1;

  // Punch-in: the shot lands slightly oversized and settles in a third of a
  // second. Small enough that you read it as energy rather than as an effect,
  // and it is what stops a fast cut sequence feeling like a slideshow.
  const punch = punchOn
    ? interpolate(spring({ frame, fps, config: { damping: 200, mass: 0.35 } }), [0, 1], [1.06, 1])
    : 1;

  const scale = drift * punch;

  const fit = shot.fit ?? "cover";
  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: fit,
    // Only matters when the frame is a different shape to the footage,
    // i.e. horizontal source squeezed into the 9:16 cut.
    objectPosition: shot.focus ?? "50% 50%",
    transform: `scale(${scale})`,
  };

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: BRAND.black }}>
      {shotSource(shot) === null ? (
        <Placeholder shot={shot} index={index} />
      ) : shot.kind === "video" ? (
        <OffthreadVideo
          src={staticFile(shotSource(shot)!)}
          startFrom={shotStartFrom(shot)}
          muted={!shot.audible}
          volume={shot.audible ? 1 : 0}
          style={mediaStyle}
        />
      ) : (
        <Img src={staticFile(shotSource(shot)!)} style={mediaStyle} />
      )}

      <Overlay accent={accent} />

      {shot.speaker ? <LowerThird speaker={shot.speaker} accent={accent} /> : null}

      {shot.subtitles?.length ? (
        <Subtitles lines={shot.subtitles} accent={accent} />
      ) : null}

      {caption ? <Caption text={caption} sub={sub} accent={accent} /> : null}
    </AbsoluteFill>
  );
};
