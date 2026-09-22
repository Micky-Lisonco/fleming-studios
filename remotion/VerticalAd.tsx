import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BRAND, DEFAULT_VARIANT, END_CARD, MUSIC, SHOTS, VARIANTS, resolveMedia } from "./edit";
import type { Variant } from "./edit";
import { EndCard } from "./components/EndCard";
import { ProgressBar } from "./components/ProgressBar";
import { Shot } from "./components/Shot";

export type VerticalAdProps = {
  /** Which campaign's words to lay over the cut. See VARIANTS in edit.ts. */
  variantId: string;
};

/**
 * Walks the SHOTS list and lays each shot on the timeline back to back.
 * Every shot runs `crossfade` frames long and the next fades in over that
 * tail, so cuts stay soft without the maths shifting when a duration
 * changes in edit.ts.
 *
 * The timeline is identical for every campaign — only the words and the
 * cutting energy change — so the athlete and the non-athlete versions can
 * never drift out of sync with each other.
 */
export const VerticalAd: React.FC<VerticalAdProps> = ({ variantId }) => {
  const variant: Variant = VARIANTS[variantId] ?? VARIANTS[DEFAULT_VARIANT];

  // The calm cut trades the punch-in for a longer dissolve. Same footage,
  // different nervous system.
  const calm = variant.energy === "calm";
  const crossfade = calm ? 8 : 3;

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      {SHOTS.map((shot, i) => {
        const from = cursor;
        cursor += shot.durationInFrames;
        const isLast = i === SHOTS.length - 1;
        const words = variant.captions[shot.id];

        return (
          <Sequence
            key={shot.id}
            from={from}
            durationInFrames={shot.durationInFrames + (isLast ? 0 : crossfade)}
            name={`${String(i + 1).padStart(2, "0")} ${shot.id}`}
          >
            <Shot
              shot={shot}
              index={i}
              crossfade={crossfade}
              isFirst={i === 0}
              caption={words?.caption}
              sub={words?.sub}
              punch={!calm}
            />
          </Sequence>
        );
      })}

      <Sequence from={cursor} durationInFrames={END_CARD.durationInFrames} name="End card">
        <EndCard endCard={variant.endCard} />
      </Sequence>

      <ProgressBar accent={BRAND.oxygen} />

      {MUSIC.file ? (
        <Audio
          src={staticFile(resolveMedia(MUSIC.file))}
          startFrom={MUSIC.startFrom}
          volume={MUSIC.volume}
        />
      ) : null}
    </AbsoluteFill>
  );
};
