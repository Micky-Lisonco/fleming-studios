import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Video,
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
import { TextCard } from "./TextCard";
import type { Card } from "./TextCard";
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
      {shot.note ? (
        <div
          style={{
            marginTop: 28,
            maxWidth: "80%",
            textAlign: "center",
            fontSize: 44,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {shot.note}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 40,
          fontSize: 28,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {CONFORMED
          ? resolveMedia(`${shot.id}.mp4`, shot.project)
          : resolveMedia(shot.file ?? `${shot.id}.mp4`, shot.project)}
      </div>
    </AbsoluteFill>
  );
};

const NO_SPEED =
  typeof process !== "undefined" && process.env?.REMOTION_NO_SPEED === "1";

/**
 * REMOTION_BROWSER_VIDEO=1 has Chrome decode the footage instead of
 * Remotion's native compositor. On Michael's Windows machine the
 * compositor's binaries (compositor.exe, ffprobe.exe) die with an access
 * violation even at concurrency 1, on frame 0, probing a single proxy -
 * so the fault is the binaries on that machine, not the edit or the
 * load. scripts/render-safe.mjs sets this, renders frames only, and
 * encodes with the system ffmpeg, so no Remotion native binary runs.
 * Slower, and the reason it is not the default.
 */
const BROWSER_VIDEO =
  typeof process !== "undefined" && process.env?.REMOTION_BROWSER_VIDEO === "1";
const FootageVideo = BROWSER_VIDEO ? Video : OffthreadVideo;

export const Shot: React.FC<{
  shot: ShotType;
  index: number;
  /** Frames of fade-in at the head of this shot. */
  crossfade: number;
  isFirst: boolean;
  /** Words for this shot, supplied by the active campaign variant. */
  caption?: string;
  sub?: string;
  /** A full-frame text beat, for the explainer cut. */
  card?: Card;
  punch: boolean;
  /** No vignette or scrim - a website header background. */
  plain?: boolean;
}> = ({ shot, index, crossfade, isFirst, caption, sub, card, punch: punchOn, plain }) => {
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

  // Continuous move across the shot. A locked-off frame held for a
  // second and a half reads as a slide; the same frame slowly
  // travelling reads as a place. Runs over the shot's whole length so
  // it never arrives anywhere and never stops.
  const progress = interpolate(frame, [0, shot.durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  let moveScale = 1;
  let moveX = 0;
  switch (shot.move) {
    case "push":
      moveScale = interpolate(progress, [0, 1], [1, 1.1]);
      break;
    case "pull":
      moveScale = interpolate(progress, [0, 1], [1.1, 1]);
      break;
    case "left":
      // Scaled up first, so there is something to travel into.
      moveScale = 1.12;
      moveX = interpolate(progress, [0, 1], [3, -3]);
      break;
    case "right":
      moveScale = 1.12;
      moveX = interpolate(progress, [0, 1], [-3, 3]);
      break;
  }

  // Punch-in: the shot lands slightly oversized and settles in a third of a
  // second. Small enough that you read it as energy rather than as an effect,
  // and it is what stops a fast cut sequence feeling like a slideshow.
  const punch = punchOn
    ? interpolate(spring({ frame, fps, config: { damping: 200, mass: 0.35 } }), [0, 1], [1.06, 1])
    : 1;

  const scale = drift * punch * moveScale;

  const fit = shot.fit ?? "cover";
  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: fit,
    // Only matters when the frame is a different shape to the footage,
    // i.e. horizontal source squeezed into the 9:16 cut.
    objectPosition: shot.pan
      ? `${interpolate(progress, [0, 1], shot.pan, {
          easing: Easing.inOut(Easing.cubic),
        })}% ${(shot.focus ?? "50% 50%").split(" ")[1] ?? "50%"}`
      : shot.focus ?? "50% 50%",
    transform: `translateX(${moveX}%) scale(${scale})`,
  };

  // A 16:9 frame cropped to 9:16 keeps about a quarter of its width, so
  // a shot of something long and horizontal - which the chamber is -
  // arrives showing the middle third of it and nothing else. No choice
  // of clip fixes that; the crop is what throws the size away. "contain"
  // fits the whole width in and letterboxes, and this is what fills the
  // space above and below: the same frame, blown up and blurred out, so
  // the letterbox reads as depth instead of as two black bars.
  const backdropStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "50% 50%",
    transform: "scale(1.3)",
    filter: "blur(44px) saturate(0.75) brightness(0.42)",
  };
  const letterboxed = fit === "contain";

  return (
    // Deliberately no background colour. A shot that painted its own
    // black meant any frame where the incoming video had not decoded yet
    // composited as black over the outgoing shot - a flash at every cut.
    // Transparent instead, so a frame that is not ready shows the
    // previous shot rather than a hole.
    <AbsoluteFill style={{ opacity }}>
      {/* Its own AbsoluteFill, out of the flow. As a bare sibling it sat
          in the parent's flex column next to the real picture, the two
          split the frame in half, and the sharp shot was pushed into the
          bottom half - under the caption instead of above it. */}
      {letterboxed && shotSource(shot) !== null ? (
        <AbsoluteFill>
          {shot.kind === "video" ? (
            <FootageVideo
              src={staticFile(shotSource(shot)!)}
              startFrom={shotStartFrom(shot)}
              playbackRate={NO_SPEED ? 1 : shot.speed ?? 1}
              muted
              volume={0}
              style={backdropStyle}
            />
          ) : (
            <Img src={staticFile(shotSource(shot)!)} style={backdropStyle} />
          )}
        </AbsoluteFill>
      ) : null}

      {shotSource(shot) === null ? (
        <Placeholder shot={shot} index={index} />
      ) : shot.kind === "video" ? (
        <FootageVideo
          src={staticFile(shotSource(shot)!)}
          startFrom={shotStartFrom(shot)}
          // Variable speed is the least-travelled path through the
          // compositor. REMOTION_NO_SPEED=1 drops it, which isolates it
          // in one run if a render crashes with an access violation.
          playbackRate={NO_SPEED ? 1 : shot.speed ?? 1}
          muted={!shot.audible}
          volume={shot.audible ? 1 : 0}
          style={mediaStyle}
        />
      ) : (
        <Img src={staticFile(shotSource(shot)!)} style={mediaStyle} />
      )}

      {plain ? null : <Overlay accent={accent} />}

      {shot.speaker ? <LowerThird speaker={shot.speaker} accent={accent} /> : null}

      {shot.subtitles?.length ? (
        <Subtitles lines={shot.subtitles} accent={accent} />
      ) : null}

      {card ? (
        <TextCard card={card} accent={accent} durationInFrames={shot.durationInFrames} />
      ) : null}

      {caption ? <Caption text={caption} sub={sub} accent={accent} /> : null}
    </AbsoluteFill>
  );
};
