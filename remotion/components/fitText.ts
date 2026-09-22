import { fitText } from "@remotion/layout-utils";

/** The one typeface the films use. */
export const FONT_FAMILY = "system-ui, -apple-system, Helvetica, sans-serif";

/**
 * Largest font size at which `text` fits `availableWidth` on one line,
 * capped at `base`.
 *
 * This measures the text with real font metrics rather than estimating
 * from character counts. The estimate approach failed on exactly the
 * words this project is full of: "ZUURSTOFKAMER" is a single
 * thirteen-character word whose M, O and W are far wider than the
 * alphabet's average, so any ratio tuned on ordinary words wrapped it
 * mid-word - ZUURSTOFKAME / R - which looks broken in a way a slightly
 * small headline never does. Dutch compounds make this the rule here,
 * not the exception: massagestoelen, vergaderruimte, gezondheidskamer.
 */
export const fitFontSize = (
  text: string,
  availableWidth: number,
  base: number,
  opts: { fontWeight?: number | string; letterSpacing?: string; uppercase?: boolean } = {}
): number => {
  const { fontWeight = 800, letterSpacing = "-0.035em", uppercase = true } = opts;

  const measured = fitText({
    text: uppercase ? text.toUpperCase() : text,
    withinWidth: availableWidth,
    fontFamily: FONT_FAMILY,
    fontWeight,
    letterSpacing,
  });

  return Math.floor(Math.min(base, measured.fontSize));
};
