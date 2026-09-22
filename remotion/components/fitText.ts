import { fitText, fitTextOnNLines } from "@remotion/layout-utils";

/** The one typeface the films use. */
export const FONT_FAMILY = "system-ui, -apple-system, Helvetica, sans-serif";

/**
 * Largest font size at which `text` fits `availableWidth` across at most
 * `maxLines`, capped at `base`.
 *
 * Fitting to a SINGLE line was the bug behind "the text is way too
 * small". A four-word Dutch headline forced onto one line of a 1080px
 * frame has to shrink to about a third of the size it wants, and the
 * result is small type surrounded by empty space - the opposite of
 * what a feed needs. Letting it run to two or three lines keeps the
 * size where it belongs and fills the frame.
 *
 * Measured with real font metrics, not estimated from character counts.
 */
export const fitFontSize = (
  text: string,
  availableWidth: number,
  base: number,
  opts: {
    fontWeight?: number | string;
    letterSpacing?: string;
    uppercase?: boolean;
    maxLines?: number;
  } = {}
): number => {
  const {
    fontWeight = 800,
    letterSpacing = "-0.035em",
    uppercase = true,
    maxLines = 1,
  } = opts;

  const value = uppercase ? text.toUpperCase() : text;
  const common = {
    text: value,
    fontFamily: FONT_FAMILY,
    fontWeight,
    letterSpacing,
  };

  const measured =
    maxLines > 1
      ? fitTextOnNLines({ ...common, maxLines, maxBoxWidth: availableWidth })
      : fitText({ ...common, withinWidth: availableWidth });

  return Math.floor(Math.min(base, measured.fontSize));
};
