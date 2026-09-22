/**
 * ─────────────────────────────────────────────────────────────
 *  THE EDIT — this is the only file you need to touch.
 * ─────────────────────────────────────────────────────────────
 *  Voice:    Flanders Cobblestone Paradise (the ad comes from the hotel)
 *  Subject:  their oxygen room — the only one in the Benelux
 *  Output:   20s, 1080x1920, for Meta / TikTok / Shorts
 *
 *  ── LANGUAGE POLICY, from the client proposal ────────────────
 *  Non-negotiable, and it is a legal position as much as a creative one:
 *
 *    "Wel herstel, ontspanning, energie en prestatie.
 *     Geen aandoeningen, geen genezing, geen medische claims."
 *
 *  So: recovery, relaxation, energy, performance — yes.
 *  Conditions, cures, medical promises — never. And no technical
 *  language either: it is a "zuurstofkamer", never a normobaric
 *  chamber. Anything that reads as treating an ailment does not go
 *  in, however good it sounds.
 *
 *  What we promise is the experience: an hour in a quiet room, in a
 *  relax chair, and waking up fitter the next day.
 *
 *  ── VARIANTS ─────────────────────────────────────────────────
 *  The proposal splits the audience into four markets and recommends
 *  starting with two: de particulier and de sporter. Same cut, same
 *  footage, different words — so each campaign gets its own video
 *  without a second edit. Pick the composition in the Studio sidebar.
 *
 *  25 frames = 1 second. The ad is 500 frames = 20 seconds.
 */

/**
 * 25, not 30, and this is forced by the footage rather than chosen.
 *
 * The Canon rolls at 50p and the drone at 25p. Against a 25 fps timeline
 * both divide cleanly - the Canon drops every other frame, the drone maps
 * one to one - so every frame in the finished film is a real frame. A 30
 * fps timeline would have to resample both (50 to 30 and 25 to 30 are each
 * awkward ratios), which shows up as judder on exactly the moving shots
 * this ad is built from: the aerials and the cobbles.
 *
 * It also means the Canon material can run at half speed with no
 * interpolation at all - 50p played at 25 is genuinely smooth slow motion,
 * not software guessing at in-between frames.
 */
export const FPS = 25;
export const TARGET_FRAMES = 20 * FPS; // 500

/**
 * ── TWO FORMATS ───────────────────────────────────────────────
 * The footage is horizontal, so `wide` uses it as shot and `vertical`
 * crops into it. Both are cut from the same timeline — change a
 * duration once and both formats follow.
 *
 *   wide      1920x1080  the website hero
 *   vertical  1080x1920  Meta and TikTok
 *
 * Type sizes are per-format rather than scaled from one design: a line
 * that reads well full-bleed on a phone is overbearing across a desktop
 * hero, and the safe areas are completely different — a website has no
 * platform UI eating the bottom fifth.
 */
export type Layout = {
  width: number;
  height: number;
  captionSize: number;
  captionSizeLong: number;
  subSize: number;
  captionBottom: number;
  sidePad: number;
  logoWidth: number;
  wordmarkSize: number;
};

export const FORMATS: Record<"vertical" | "wide", Layout> = {
  vertical: {
    width: 1080, height: 1920,
    captionSize: 128, captionSizeLong: 104, subSize: 40,
    // Clear of the bottom fifth, where Reels and TikTok put their own UI.
    captionBottom: 360, sidePad: 72,
    logoWidth: 560, wordmarkSize: 118,
  },
  wide: {
    width: 1920, height: 1080,
    captionSize: 96, captionSizeLong: 76, subSize: 34,
    captionBottom: 120, sidePad: 104,
    logoWidth: 520, wordmarkSize: 104,
  },
};

/** Picks the layout from the composition's own shape. */
export const layoutFor = (width: number, height: number): Layout =>
  height > width ? FORMATS.vertical : FORMATS.wide;

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

/**
 * "media" holds CONFORMED clips: each one is a single shot, already
 * trimmed to its in and out points and already graded, produced by
 * scripts/conform.ps1. That is what makes the final render correct -
 * rendering straight from the ungraded masters would deliver the flat
 * log picture the proxies were graded to avoid.
 *
 * Because a conformed clip is exactly its shot, it is named after the
 * shot and starts at frame zero. The proxy path keeps the original
 * filenames and trims.
 */
export const CONFORMED = MEDIA_DIR === "media";

/** Resolves a bare filename against whichever media folder is active. */
export const resolveMedia = (file: string): string => `${MEDIA_DIR}/${file}`;

/** The file a shot plays, in whichever mode is active. */
export const shotSource = (shot: Shot): string | null => {
  if (CONFORMED) return `${MEDIA_DIR}/${shot.id}.mp4`;
  return shot.file ? `${MEDIA_DIR}/${shot.file}` : null;
};

/**
 * Where playback starts inside that file. A conformed clip has the trim
 * already applied, so seeking into it again would skip past the moment
 * the shot was chosen for.
 */
export const shotStartFrom = (shot: Shot): number =>
  CONFORMED ? 0 : (shot.startFrom ?? 0);

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

/**
 * One line of speech, in frames relative to the START OF THE SHOT (not the
 * timeline). Lift the numbers straight from the .srt: seconds x 30.
 */
export type Subtitle = { from: number; to: number; text: string };

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
  /** 25 frames = 1 second. */
  durationInFrames: number;
  /** Trim: start this many frames into the source. Video only. */
  startFrom?: number;
  /** Accent colour for this shot. */
  accent?: string;
  /**
   * Let this clip's own sound through. This is interview footage, so any
   * shot carrying a soundbite must set this — and the music ducks under it
   * automatically.
   */
  audible?: boolean;
  /**
   * Burned-in subtitles for this shot. Not optional in practice: most of
   * Meta and TikTok is watched with the sound off, so an unsubtitled
   * soundbite is a silent shot of someone's face.
   */
  subtitles?: Subtitle[];
  /** Key into SPEAKERS. Shows a name super the first time we see them. */
  speaker?: string;
  /**
   * What kind of material this slot wants. Not used at render time - it
   * is there so assigning 30 clips to 15 slots is a matter of matching
   * like for like.
   *
   *   aerial    the DJI drone clips
   *   interview Fien on camera, sound on
   *   broll     everything else the Canon shot
   */
  wants?: "aerial" | "interview" | "broll";
  /** How the file fills the frame. "cover" crops, "contain" letterboxes. */
  fit?: "cover" | "contain";
  /**
   * Where the crop holds when horizontal footage is squeezed into 9:16.
   * A CSS object-position: "50% 50%" centres, "30% 50%" favours the left
   * of frame. Only bites on the vertical cut — the wide cut uses the
   * footage as shot. Set this whenever the subject is off-centre.
   */
  focus?: string;
  /** Slow push-in. On by default for stills. */
  kenBurns?: boolean;
  /** Punch-in on the cut — a fast settle from slightly oversized. On by default. */
  punch?: boolean;
};

/**
 * ── THE 15 SHOTS ──────────────────────────────────────────────
 * Two halves. The first is the damage: cobbles, effort, legs gone.
 * The second is the repair: the chamber, the hour, the morning after.
 * The palette turns from stone to oxygen blue at shot 06 — that colour
 * flip is the story beat, so keep it there even if clips move around.
 */
export const SHOTS: Shot[] = [
  /**
   * ── INTERVIEW STRUCTURE ────────────────────────────────────
   * The cameraman asks, Fien answers. Only her answers are in the cut,
   * so it plays as someone telling you about the room rather than as an
   * interview you are eavesdropping on.
   *
   * Shots alternate: a SOUNDBITE carries the argument, then B-ROLL over
   * the top of it or between. A soundbite shot needs `audible: true`,
   * `subtitles`, and `startFrom` pointing at the moment the sentence
   * begins in the master — take that number straight from the .srt.
   *
   * Filling one in, once the transcripts land:
   *
   *   { id: "01-hook", file: "03-fien-interview.mp4", kind: "video",
   *     durationInFrames: 75, startFrom: 1290, audible: true,
   *     speaker: "fien", accent: BRAND.oxygen,
   *     subtitles: [
   *       { from: 0,  to: 40, text: "Wij zijn de enige in de Benelux" },
   *       { from: 42, to: 75, text: "met zo'n zuurstofkamer." },
   *     ] },
   *
   * Subtitle frames are relative to the shot, not the timeline: seconds
   * in the .srt minus `startFrom` in seconds, times 30.
   */

  // ── AERIAL OPEN (0.0s – 2.0s) — establish the Flemish Ardennes before
  // a word is spoken. Drone clip, to be chosen from the filmstrips.
  { id: "01-aerial",   file: null, kind: "video", durationInFrames: 50, accent: BRAND.cobble, wants: "aerial" },

  // ── THE CLAIM (2.0s – 6.0s) — the reason the ad exists, and it comes
  // from her rather than a title card. From the long interview take.
  //
  //   "De normobarische kamer is de enige in de Benelux.
  //    Deze staat in Zegelsem, Brakel."
  //
  // The interviewer's question sits just before it, so startFrom trims
  // into her answer. Worth checking in the Studio: whisper's segment
  // boundaries are coarse and the exact word start may be a beat either
  // side of this.
  { id: "02-claim",    file: "08-6E8A6399.mp4", kind: "video", durationInFrames: 100, startFrom: 2463, accent: BRAND.oxygen, audible: true, speaker: "fien", wants: "interview",
    subtitles: [
      { from: 0,  to: 52,  text: "De zuurstofkamer is de enige" },
      { from: 52, to: 100, text: "in de Benelux." },
    ] },

  // ── THE ROOM (6.0s – 7.6s)
  { id: "03-room",     file: null, kind: "video", durationInFrames: 40, accent: BRAND.oxygen, wants: "broll" },

  // ── THE EXPERIENCE (7.6s – 11.6s) — what it is actually like. This is
  // the line the whole brief asks for: no promise, no condition, just
  // the hour itself.
  //
  //   "U kan gewoon zitten, praten, lezen, rusten,
  //    zonder dat u er iets van merkt."
  { id: "04-feel",     file: "09-6E8A6400.mp4", kind: "video", durationInFrames: 100, startFrom: 575, accent: BRAND.oxygen, audible: true, wants: "interview",
    subtitles: [
      { from: 0,  to: 55,  text: "U kan gewoon zitten, lezen, rusten" },
      { from: 55, to: 100, text: "zonder dat u er iets van merkt." },
    ] },

  // ── INSIDE (11.6s – 14.8s) — the chairs, the detail.
  { id: "05-chairs",   file: null, kind: "video", durationInFrames: 40, accent: BRAND.pulse, wants: "broll" },
  { id: "06-detail",   file: null, kind: "video", durationInFrames: 40, accent: BRAND.pulse, wants: "broll" },

  // ── AWAY (14.8s – 16.6s) — back to the air to close.
  { id: "07-away",     file: null, kind: "video", durationInFrames: 45, accent: BRAND.oxygen, wants: "aerial" },
];

/** Words for one campaign. The timeline above never changes between them. */
export type Variant = {
  id: string;
  /** Shown in the Studio sidebar and used for the output filename. */
  label: string;
  /** "high" punches on every cut; "calm" softens it for the non-athlete cut. */
  energy: "high" | "calm";
  /** Keyed by shot id. A shot with no entry simply runs without type. */
  captions: Record<string, { caption: string; sub?: string }>;
  endCard: { wordmark: string; line: string; venue: string; cta: string };
};

const END_VENUE_NL = "De zuurstofkamer — de enige in de Benelux";
const END_VENUE_EN = "The oxygen room — the only one in the Benelux";
const END_CTA = "flanderscobblestoneparadise.be";

export const VARIANTS: Record<string, Variant> = {
  /** Campaign 2 in the proposal: the athlete who takes recovery seriously. */
  "sporter-nl": {
    id: "sporter-nl",
    label: "Sporter (NL)",
    energy: "high",
    captions: {
      // No caption over a soundbite - her words and a headline in the
      // same second fight each other.
      "03-room":   { caption: "DE ZUURSTOFKAMER" },
      "05-chairs": { caption: "TWEE UUR", sub: "In een stoel, meer niet" },
      "07-away":   { caption: "MORGEN RIJD JE WEER" },
    },
    endCard: { wordmark: "FLANDERS", line: "COBBLESTONE PARADISE", venue: END_VENUE_NL, cta: END_CTA },
  },

  /**
   * Campaign 1 in the proposal, and the one it recommends starting with:
   * someone who is simply ready for some rest. Not a sportsperson, not a
   * group — so the language drops every trace of performance.
   */
  "particulier-nl": {
    id: "particulier-nl",
    label: "Particulier (NL)",
    energy: "calm",
    captions: {
      "03-room":   { caption: "DE ZUURSTOFKAMER" },
      "05-chairs": { caption: "TWEE UUR", sub: "Voor jezelf" },
      "07-away":   { caption: "MORGEN STA JE FITTER OP" },
    },
    endCard: { wordmark: "FLANDERS", line: "COBBLESTONE PARADISE", venue: END_VENUE_NL, cta: END_CTA },
  },

  /** Campaign 4: the British and international sport tourist. */
  "sporter-en": {
    id: "sporter-en",
    label: "Sporter (EN)",
    energy: "high",
    captions: {
      "03-room":   { caption: "THE OXYGEN ROOM" },
      "05-chairs": { caption: "TWO HOURS", sub: "In a chair. That is all." },
      "07-away":   { caption: "TOMORROW YOU RIDE AGAIN" },
    },
    endCard: { wordmark: "FLANDERS", line: "COBBLESTONE PARADISE", venue: END_VENUE_EN, cta: END_CTA },
  },
};

export const DEFAULT_VARIANT = "sporter-nl";


/**
 * ── WHO IS TALKING ────────────────────────────────────────────
 * The cameraman's questions are not in the cut — only the answers are,
 * so the ad never sounds like an interview being overheard. Fien gets a
 * name super the first time she speaks and never again.
 */
export const SPEAKERS: Record<string, { name: string; role: string }> = {
  fien: { name: "Fien Merckx", role: "Flanders Cobblestone Paradise" },
};

/**
 * ── END CARD ──────────────────────────────────────────────────
 * `logo` and `venueLogo` are filenames in `public/`. Either can be null,
 * and the wordmark renders as type instead — so the card is finished
 * whether or not the brand assets have landed.
 */
export const END_CARD = {
  durationInFrames: 85,
  /** Filename in `public/`. Null renders the wordmark as type instead. */
  logo: null as string | null, // e.g. "flanders-logo.png"
  accent: BRAND.oxygen,
};

export const TOTAL_FRAMES =
  SHOTS.reduce((n, s) => n + s.durationInFrames, 0) + END_CARD.durationInFrames;

/**
 * Frames of crossfade between shots. Kept short on purpose: energy comes
 * from cuts landing cleanly, not from footage dissolving into footage.
 * 0 = hard cuts throughout.
 */
export const CROSSFADE = 3;

/**
 * ── MUSIC ─────────────────────────────────────────────────────
 * Drop a track in the media folder and name it here. Clips are muted by
 * default; set `audible: true` on a shot to let its own sound through
 * (worth doing on one cobble shot — the rattle sells the first half).
 */
export const MUSIC: {
  file: string | null;
  startFrom: number;
  volume: number;
  /** Level the bed drops to while someone is speaking. */
  duckedVolume: number;
} = {
  file: null, // e.g. "track.mp3"
  startFrom: 0,
  volume: 0.85,
  duckedVolume: 0.16,
};

/**
 * Frame ranges where a clip's own audio is playing, so the music bed can
 * duck out from under it. Derived from the shots rather than written by
 * hand — move a shot and the ducking moves with it.
 */
export const speechRanges = (): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  for (const shot of SHOTS) {
    if (shot.audible) ranges.push([cursor, cursor + shot.durationInFrames]);
    cursor += shot.durationInFrames;
  }
  return ranges;
};
