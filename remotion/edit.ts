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
 *  ── TWO FILMS, NOT ONE IN TWO SHAPES ─────────────────────────
 *  They were one timeline in two crops. They are not the same film:
 *
 *    brand  1920x1080, for the website. Flanders Cobblestone itself -
 *           the village, the building, the setting. The oxygen room
 *           appears as one of the things on offer, briefly, not as
 *           the subject.
 *
 *    ad     1080x1920, for Meta and TikTok. The oxygen room is the
 *           whole point, and the first three seconds have to earn the
 *           next seventeen.
 *
 *  ── NO INTERVIEW AUDIO ───────────────────────────────────────
 *  The takes are full of restarts, direction and hesitation - "nee,
 *  dat is niet goed", "opnieuw" - and four seconds of that reads worse
 *  than silence. Both films are picture, type and music. A voiceover
 *  can be laid over either later: MUSIC already ducks, so adding a
 *  voice track is a small change, not a rebuild.
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
 * ── THE BRAND FILM (wide, for the website) ────────────────────
 * Flanders Cobblestone, shown at its best. The drone does the work:
 * up off the cobbles that give the place its name, out over the
 * village, down onto the building, then away across the Ardennes.
 * The oxygen room appears once, briefly, as one of the things on
 * offer - it is not the subject here.
 *
 * No speech. Music and a few words.
 */
export const SHOTS_BRAND: Shot[] = [
  // Starts on the cobbles themselves. The brand is named after them,
  // and the drone rising off them into the village is the single best
  // move in the whole shoot.
  { id: "b1-cobbles",  file: "20-DJI_20260905112103_0014_D.mp4", kind: "video", durationInFrames: 60, startFrom: 25,  accent: BRAND.cobble },
  { id: "b2-village",  file: "21-DJI_20260905112207_0020_D.mp4", kind: "video", durationInFrames: 50, startFrom: 75,  accent: BRAND.cobble },
  { id: "b3-arrive",   file: "27-DJI_20260905124432_0031_D.mp4", kind: "video", durationInFrames: 55, startFrom: 150, accent: BRAND.oxygen },
  { id: "b4-hotel",    file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 50, startFrom: 250, accent: BRAND.oxygen },
  // The oxygen room, in passing. Long enough to notice, short enough
  // that the film is still about the hotel.
  { id: "b5-tank",     file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 45, startFrom: 100, accent: BRAND.pulse },
  { id: "b6-inside",   file: "11-6E8A6402.mp4",                  kind: "video", durationInFrames: 40, startFrom: 50,  accent: BRAND.pulse },
  { id: "b7-chair",    file: "17-6E8A6408.mp4",                  kind: "video", durationInFrames: 40, startFrom: 75,  accent: BRAND.pulse },
  // Pull away. The last thing you see is where it is.
  { id: "b8-away",     file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 60, startFrom: 250, accent: BRAND.oxygen },
];

/**
 * ── THE AD (vertical, for Meta and TikTok) ────────────────────
 * The first three seconds decide whether the rest is watched, so the
 * cut opens on the thing nobody can identify: a forty-foot silver tube
 * on a cobbled forecourt with cyclists walking past it. One second is
 * enough to provoke the question - two is long enough to answer it
 * yourself and scroll on.
 *
 * Fast throughout. Twelve shots in seventeen seconds.
 */
export const SHOTS_AD: Shot[] = [
  { id: "a1-tank",     file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 28, startFrom: 120, accent: BRAND.oxygen },
  { id: "a2-tank2",    file: "23-DJI_20260905124037_0022_D.mp4", kind: "video", durationInFrames: 30, startFrom: 300, accent: BRAND.oxygen },
  { id: "a3-inside",   file: "11-6E8A6402.mp4",                  kind: "video", durationInFrames: 35, startFrom: 50,  accent: BRAND.oxygen },
  { id: "a4-seats",    file: "08-6E8A6399.mp4",                  kind: "video", durationInFrames: 32, startFrom: 300, accent: BRAND.oxygen },
  { id: "a5-chair",    file: "17-6E8A6408.mp4",                  kind: "video", durationInFrames: 38, startFrom: 75,  accent: BRAND.pulse },
  { id: "a6-detail",   file: "12-6E8A6403.mp4",                  kind: "video", durationInFrames: 32, startFrom: 700, accent: BRAND.pulse },
  { id: "a7-chair2",   file: "14-6E8A6405.mp4",                  kind: "video", durationInFrames: 35, startFrom: 50,  accent: BRAND.pulse },
  { id: "a8-cobbles",  file: "20-DJI_20260905112103_0014_D.mp4", kind: "video", durationInFrames: 35, startFrom: 25,  accent: BRAND.cobble },
  { id: "a9-hotel",    file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 38, startFrom: 250, accent: BRAND.oxygen },
  { id: "a10-village", file: "22-DJI_20260905112604_0021_D.mp4", kind: "video", durationInFrames: 30, startFrom: 200, accent: BRAND.cobble },
  { id: "a11-arrive",  file: "27-DJI_20260905124432_0031_D.mp4", kind: "video", durationInFrames: 32, startFrom: 150, accent: BRAND.oxygen },
  { id: "a12-away",    file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 45, startFrom: 250, accent: BRAND.oxygen },
];

export type Film = {
  id: string;
  label: string;
  format: "vertical" | "wide";
  shots: Shot[];
  energy: "high" | "calm";
  /** Keyed by shot id. A shot with no entry runs without type. */
  captions: Record<string, { caption: string; sub?: string }>;
  endCard: {
    durationInFrames: number;
    wordmark: string;
    line: string;
    venue: string;
    cta: string;
  };
};

const CTA = "flanderscobblestoneparadise.be";

export const FILMS: Record<string, Film> = {
  /** The website film. Calm, wide, about the place. */
  "brand-wide": {
    id: "brand-wide",
    label: "Flanders Cobblestone (website, 16:9)",
    format: "wide",
    shots: SHOTS_BRAND,
    energy: "calm",
    captions: {
      "b1-cobbles": { caption: "DE VLAAMSE ARDENNEN" },
      "b4-hotel":   { caption: "FLANDERS COBBLESTONE", sub: "Verblijf, bistro en vergaderruimte" },
      "b5-tank":    { caption: "DE ZUURSTOFKAMER", sub: "De enige in de Benelux" },
      "b8-away":    { caption: "RIJD HARD. RUST HARDER." },
    },
    endCard: {
      durationInFrames: 100,
      wordmark: "FLANDERS",
      line: "COBBLESTONE PARADISE",
      venue: "Brakel - Vlaamse Ardennen",
      cta: CTA,
    },
  },

  /** The campaign film. Fast, vertical, about the room. */
  "ad-nl": {
    id: "ad-nl",
    label: "Zuurstofkamer (Meta/TikTok, 9:16)",
    format: "vertical",
    shots: SHOTS_AD,
    energy: "high",
    captions: {
      "a1-tank":    { caption: "WAT IS DIT?" },
      "a2-tank2":   { caption: "EEN ZUURSTOFKAMER" },
      "a4-seats":   { caption: "DE ENIGE", sub: "in de Benelux" },
      "a5-chair":   { caption: "TWEE UUR" },
      "a7-chair2":  { caption: "EEN STOEL. MEER NIET." },
      "a9-hotel":   { caption: "VLAAMSE ARDENNEN" },
      "a12-away":   { caption: "BRAKEL", sub: "Zegelsem" },
    },
    endCard: {
      durationInFrames: 90,
      wordmark: "FLANDERS",
      line: "COBBLESTONE PARADISE",
      venue: "De zuurstofkamer - de enige in de Benelux",
      cta: CTA,
    },
  },
};

export const DEFAULT_FILM = "ad-nl";

/** Who is on camera, if a name super is ever wanted. */
export const SPEAKERS: Record<string, { name: string; role: string }> = {
  fien: { name: "Fien Merckx", role: "Flanders Cobblestone Paradise" },
};

/** Logo for the end card. Null renders the wordmark as type. */
export const END_CARD = {
  logo: null as string | null,
  accent: BRAND.oxygen,
};

export const filmFrames = (film: Film): number =>
  film.shots.reduce((n, s) => n + s.durationInFrames, 0) + film.endCard.durationInFrames;

/** Frames of crossfade. Short on the ad, longer on the brand film. */
export const crossfadeFor = (film: Film): number => (film.energy === "calm" ? 8 : 3);

/**
 * ── MUSIC ─────────────────────────────────────────────────────
 * Both films are music-led now that the interview audio is out. Drop a
 * track in the media folder and name it here.
 */
export const MUSIC: {
  file: string | null;
  startFrom: number;
  volume: number;
  duckedVolume: number;
} = {
  file: null,
  startFrom: 0,
  volume: 0.85,
  duckedVolume: 0.16,
};

/** Frame ranges where a shot's own audio plays, so music can duck. */
export const speechRanges = (film: Film): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  for (const shot of film.shots) {
    if (shot.audible) ranges.push([cursor, cursor + shot.durationInFrames]);
    cursor += shot.durationInFrames;
  }
  return ranges;
};
