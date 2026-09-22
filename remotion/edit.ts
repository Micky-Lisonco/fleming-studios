/**
 * ─────────────────────────────────────────────────────────────
 *  THE EDIT — this is the only file you need to touch.
 * ─────────────────────────────────────────────────────────────
 *  The whole 20-second vertical ad is described here: which file
 *  plays, for how long, what it says on screen. Everything else
 *  (rendering, transitions, safe areas, export) is handled for you.
 *
 *  To swap a clip:      change `src`
 *  To hold a shot:      change `durationInFrames`
 *  To reorder:          move the object up or down the list
 *  To trim a clip:      set `startFrom` (skips N frames of the source)
 *
 *  30 frames = 1 second. The ad is 600 frames = 20 seconds.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TARGET_FRAMES = 20 * FPS; // 600

/** Fleming Studios palette, lifted from the studio doors. */
export const BRAND = {
  black: "#000000",
  white: "#FFFFFF",
  cyan: "#00D4FF",
  violet: "#8B5CF6",
  amber: "#FFB800",
  mint: "#00E5B0",
  copper: "#C0692E",
  teal: "#00FFD0",
} as const;

export type Shot = {
  /** Short name, only used for your own reference in the studio timeline. */
  id: string;
  /**
   * Path to the file, relative to `public/`. e.g. "media/clip-01.mp4".
   * Leave as null and a labelled placeholder card renders instead, so the
   * edit always plays even before every file has landed.
   */
  src: string | null;
  kind: "video" | "image";
  /** 30 frames = 1 second. */
  durationInFrames: number;
  /** Trim: start this many frames into the source file. Video only. */
  startFrom?: number;
  /** Big on-screen line. Keep it to ~4 words — this is a thumb-stopper, not a paragraph. */
  caption?: string;
  /** Small line under the caption. */
  sub?: string;
  /** Accent colour for this shot's caption bar. */
  accent?: string;
  /** Let this clip's own sound through. Off by default so the music bed stays clean. */
  audible?: boolean;
  /** How the file fills the 9:16 frame. "cover" crops, "contain" letterboxes. */
  fit?: "cover" | "contain";
  /** Slow push-in on the shot. Off by default for video, on for stills. */
  kenBurns?: boolean;
};

/**
 * ── THE 15 SHOTS ──────────────────────────────────────────────
 * Durations are tuned for social: a long hook to stop the scroll,
 * then fast cuts through the body, then room to read the end card.
 * The sum is checked against TARGET_FRAMES at the bottom of this file.
 */
export const SHOTS: Shot[] = [
  // ── HOOK (0.0s – 2.5s) — the scroll-stopper, give it room to land.
  { id: "01-hook",     src: null, kind: "video", durationInFrames: 75, caption: "THE MACHINES WON", sub: "So we taught them to work for you", accent: BRAND.cyan },

  // ── BODY (2.5s – 15.7s) — twelve fast cuts, 1.1s each.
  { id: "02",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.cyan },
  { id: "03",          src: null, kind: "video", durationInFrames: 33, caption: "BRANDING", accent: BRAND.cyan },
  { id: "04",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.violet },
  { id: "05",          src: null, kind: "video", durationInFrames: 33, caption: "WEBSITES", accent: BRAND.violet },
  { id: "06",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.amber },
  { id: "07",          src: null, kind: "video", durationInFrames: 33, caption: "CONTENT", accent: BRAND.amber },
  { id: "08",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.mint },
  { id: "09",          src: null, kind: "video", durationInFrames: 33, caption: "CAMPAIGNS", accent: BRAND.mint },
  { id: "10",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.copper },
  { id: "11",          src: null, kind: "video", durationInFrames: 33, caption: "AI PRODUCTION", accent: BRAND.copper },
  { id: "12",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.teal },
  { id: "13",          src: null, kind: "video", durationInFrames: 33, accent: BRAND.teal },

  // ── TURN (15.7s – 18.5s) — slow down, let the payoff breathe.
  { id: "14-payoff",   src: null, kind: "video", durationInFrames: 45, caption: "ONE STUDIO", sub: "Six rooms. Every discipline.", accent: BRAND.teal },
  { id: "15-closer",   src: null, kind: "video", durationInFrames: 39, accent: BRAND.teal },
];

/** ── END CARD (18.5s – 20.0s) — logo, line, call to action. */
export const END_CARD = {
  durationInFrames: 45,
  logo: "logo.png",
  /** Tagline under the logo. Leave empty to let the logo stand alone. */
  line: "THE STUDIO THAT ADAPTED",
  cta: "flemingstudios.com",
  accent: BRAND.teal,
};

export const TOTAL_FRAMES =
  SHOTS.reduce((n, s) => n + s.durationInFrames, 0) + END_CARD.durationInFrames;

/** Frames of crossfade between shots. 0 = hard cuts. */
export const CROSSFADE = 6;

/**
 * ── MUSIC ─────────────────────────────────────────────────────
 * Drop a track in `public/media/` and point at it. Clips are muted
 * by default so the bed stays clean; set `audible: true` on a shot
 * to let that one clip's own sound through.
 */
export const MUSIC: { src: string | null; startFrom: number; volume: number } = {
  src: null, // e.g. "media/track.mp3"
  startFrom: 0,
  volume: 0.85,
};
