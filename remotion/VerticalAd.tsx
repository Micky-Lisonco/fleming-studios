import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BRAND, CROSSFADE, END_CARD, MUSIC, SHOTS } from "./edit";
import { EndCard } from "./components/EndCard";
import { ProgressBar } from "./components/ProgressBar";
import { Shot } from "./components/Shot";

/**
 * Walks the SHOTS list and lays each one on the timeline back to back.
 * Every shot runs CROSSFADE frames long, and the next one fades in on
 * top of that tail — so cuts are soft without the maths moving around
 * when you change a duration in edit.ts.
 */
export const VerticalAd: React.FC = () => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      {SHOTS.map((shot, i) => {
        const from = cursor;
        cursor += shot.durationInFrames;
        const isLast = i === SHOTS.length - 1;

        return (
          <Sequence
            key={shot.id}
            from={from}
            durationInFrames={shot.durationInFrames + (isLast ? 0 : CROSSFADE)}
            name={`${String(i + 1).padStart(2, "0")} ${shot.id}`}
          >
            <Shot shot={shot} index={i} crossfade={CROSSFADE} isFirst={i === 0} />
          </Sequence>
        );
      })}

      <Sequence from={cursor} durationInFrames={END_CARD.durationInFrames} name="End card">
        <EndCard />
      </Sequence>

      <ProgressBar accent={BRAND.teal} />

      {MUSIC.src ? (
        <Audio
          src={staticFile(MUSIC.src)}
          startFrom={MUSIC.startFrom}
          volume={MUSIC.volume}
        />
      ) : null}
    </AbsoluteFill>
  );
};
