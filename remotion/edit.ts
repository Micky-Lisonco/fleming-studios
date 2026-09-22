/**
 * ─────────────────────────────────────────────────────────────
 *  THE EDIT — this is the only file you need to touch.
 * ─────────────────────────────────────────────────────────────
 *  Client:  Normocare — the oxygen room (normobaric therapy)
 *  Venue:   Flanders Cobblestone Paradise, Brakel, Flemish Ardennes
 *  Output:  20s, 1080x1920, for Reels / TikTok / Shorts
 *
 *  To swap a clip:   change `file`
 *  To hold a shot:   change `durationInFrames`
 *  To reorder:       move the object up or down the list
 *  To trim a clip:   set `startFrom` (skips N frames into the source)
 *
 *  30 frames = 1 second. The ad is 600 frames = 20 seconds.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TARGET_FRAMES = 20 * FPS; // 600

/**
 * ── OFFLINE / ONLINE ──────────────────────────────────────────
 * The cut is designed against small proxies, then rendered against
 * the full-resolution masters. Both folders hold files with the SAME
 * names, so switching is one line — no re-linking, no re-cutting.
 *
 *   "media-proxy"  light stand-ins from scripts/make-proxies.sh
 *   "media"        the camera masters, for the final render
 *
 * Or override per-render without editing anything:
 *   REMOTION_MEDIA_DIR=media npm run video:render
 */
const ENV_DIR =
  typeof process !== "undefined" ? process.env?.REMOTION_MEDIA_DIR : undefined;

export const MEDIA_DIR: string = ENV_DIR || "media-proxy";

/** Resolves a bare filename against whichever media folder is active. */
export const resolveMedia = (file: string): string => `${MEDIA_DIR}/${file}`;

/**
 * Palette: clinical oxygen blues against the warm stone of the cobbles,
 * so the ride half and the recovery half read as two different worlds.
 * Swap these for the real Normocare / Flanders brand values once we have them.
 */
export const BRAND = {
  black: "#04121A",
  white: "#FFFFFF",
  oxygen: "#00C2FF",
  pulse: "#00E5B0",
  cobble: "#C08B4A",
  deep: "#0A2433",
} as const;

export type Shot = {
  /** Short name, shown on the Studio timeline. */
  id: string;
  /**
   * Bare filename inside the active media folder, e.g. "03-koppenberg.mp4".
   * Leave null and a labelled placeholder renders instead, so the edit
   * always plays end to end while footage is still coming in.
   */
  file: string | null;
  kind: "video" | "image";
  /** 30 frames = 1 second. */
  durationInFrames: number;
  /** Trim: start this many frames into the source. Video only. */
  startFrom?: number;
  /** Big on-screen line. ~4 words — a thumb-stopper, not a paragraph. */
  caption?: string;
  /** Small line under the caption. */
  sub?: string;
  /** Accent colour for this shot. */
  accent?: string;
  /** Let this clip's own sound through. Off by default so the bed stays clean. */
  audible?: boolean;
  /** How the file fills the 9:16 frame. "cover" crops, "contain" letterboxes. */
  fit?: "cover" | "contain";
  /** Slow push-in. On by default for stills. */
  kenBurns?: boolean;
};

/**
 * ── THE 15 SHOTS ──────────────────────────────────────────────
 * Two halves. The first is the damage: cobbles, effort, legs gone.
 * The second is the repair: the chamber, the hour, the morning after.
 * The palette turns from stone to oxygen blue at shot 06 — that colour
 * flip is the story beat, so keep it there even if clips move around.
 */
export const SHOTS: Shot[] = [
  // ── THE RIDE (0.0s – 8.2s) ──
  { id: "01-hook",    file: null, kind: "video", durationInFrames: 75, caption: "COBBLES DON'T FORGIVE", sub: "The Flemish Ardennes take everything you have", accent: BRAND.cobble },
  { id: "02-pave",    file: null, kind: "video", durationInFrames: 33, accent: BRAND.cobble },
  { id: "03-climb",   file: null, kind: "video", durationInFrames: 33, caption: "RIDE HARD", accent: BRAND.cobble },
  { id: "04-effort",  file: null, kind: "video", durationInFrames: 33, accent: BRAND.cobble },
  { id: "05-empty",   file: null, kind: "video", durationInFrames: 33, caption: "THEN THE LEGS GO", accent: BRAND.cobble },

  // ── THE TURN (8.2s – 12.6s) — palette flips to oxygen here ──
  { id: "06-arrive",  file: null, kind: "video", durationInFrames: 33, accent: BRAND.oxygen },
  { id: "07-door",    file: null, kind: "video", durationInFrames: 33, caption: "STEP INSIDE", accent: BRAND.oxygen },
  { id: "08-chamber", file: null, kind: "video", durationInFrames: 33, accent: BRAND.oxygen },
  { id: "09-reveal",  file: null, kind: "video", durationInFrames: 33, caption: "THE OXYGEN ROOM", sub: "Normobaric therapy — no pressure chamber, no mask", accent: BRAND.oxygen },

  // ── THE REPAIR (12.6s – 17.7s) ──
  { id: "10-settle",  file: null, kind: "video", durationInFrames: 33, accent: BRAND.oxygen },
  { id: "11-session", file: null, kind: "video", durationInFrames: 33, caption: "SIXTY MINUTES", accent: BRAND.oxygen },
  { id: "12-breathe", file: null, kind: "video", durationInFrames: 33, caption: "LACTATE CLEARED", accent: BRAND.pulse },
  { id: "13-rest",    file: null, kind: "video", durationInFrames: 33, caption: "SORENESS EASED", accent: BRAND.pulse },

  // ── THE PAYOFF (17.7s – 18.5s) ──
  { id: "14-morning", file: null, kind: "video", durationInFrames: 45, caption: "TOMORROW YOU RIDE AGAIN", accent: BRAND.pulse },
  { id: "15-depart",  file: null, kind: "video", durationInFrames: 39, accent: BRAND.pulse },
];

/**
 * ── END CARD ──────────────────────────────────────────────────
 * `logo` and `venueLogo` are filenames in `public/`. Either can be null,
 * and the wordmark renders as type instead — so the card is finished
 * whether or not the brand assets have landed.
 */
export const END_CARD = {
  durationInFrames: 45,
  logo: null as string | null, // e.g. "normocare-logo.png"
  wordmark: "NORMOCARE",
  line: "THE OXYGEN ROOM",
  venue: "at Flanders Cobblestone Paradise",
  cta: "normocare.net",
  accent: BRAND.oxygen,
};

export const TOTAL_FRAMES =
  SHOTS.reduce((n, s) => n + s.durationInFrames, 0) + END_CARD.durationInFrames;

/** Frames of crossfade between shots. 0 = hard cuts. */
export const CROSSFADE = 6;

/**
 * ── MUSIC ─────────────────────────────────────────────────────
 * Drop a track in the media folder and name it here. Clips are muted by
 * default; set `audible: true` on a shot to let its own sound through
 * (worth doing on one cobble shot — the rattle sells the first half).
 */
export const MUSIC: { file: string | null; startFrom: number; volume: number } = {
  file: null, // e.g. "track.mp3"
  startFrom: 0,
  volume: 0.85,
};
