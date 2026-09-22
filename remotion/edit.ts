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
    // Sized for a phone held at arm's length, not for a desktop preview.
    // Type that looks generous on a 27-inch monitor is small in the
    // hand, and small type in a feed is simply not read.
    captionSize: 148, captionSizeLong: 124, subSize: 58,
    // Clear of the bottom fifth, where Reels and TikTok put their own UI.
    captionBottom: 360, sidePad: 64,
    logoWidth: 560, wordmarkSize: 124,
  },
  wide: {
    width: 1920, height: 1080,
    captionSize: 112, captionSizeLong: 92, subSize: 46,
    captionBottom: 120, sidePad: 96,
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
  /**
   * Continuous camera move across the whole shot. This is what stops a
   * cut sequence reading as a slideshow: even a locked-off frame feels
   * alive if it is slowly travelling somewhere.
   *
   *   push   scales in
   *   pull   scales out
   *   left   drifts left
   *   right  drifts right
   */
  move?: "push" | "pull" | "left" | "right";
  /** Playback rate. 1.2 on a drone shot buys energy for free. */
  speed?: number;
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
  // Fourteen shots in twenty seconds, averaging a second and a half,
  // and every one of them moving. The previous cut ran eight shots at
  // two and a half seconds each with the camera parked, which on a
  // website header reads as a slideshow rather than a place.
  { id: "b01-cobbles", file: "20-DJI_20260905112103_0014_D.mp4", kind: "video", durationInFrames: 50, startFrom: 25,  move: "push", speed: 1.15, accent: BRAND.cobble },
  { id: "b02-village", file: "21-DJI_20260905112207_0020_D.mp4", kind: "video", durationInFrames: 35, startFrom: 75,  move: "pull", speed: 1.2,  accent: BRAND.cobble },
  { id: "b03-church",  file: "22-DJI_20260905112604_0021_D.mp4", kind: "video", durationInFrames: 32, startFrom: 200, move: "push", speed: 1.2,  accent: BRAND.cobble },
  { id: "b04-arrive",  file: "27-DJI_20260905124432_0031_D.mp4", kind: "video", durationInFrames: 36, startFrom: 150, move: "push", speed: 1.15, accent: BRAND.oxygen },
  { id: "b05-hotel",   file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 44, startFrom: 250, move: "pull", speed: 1.15, accent: BRAND.oxygen },
  // Sliding along the balconies - the most architectural shot of the
  // set, and the one that sells the building rather than the plot.
  { id: "b06-balcony", file: "28-DJI_20260905124519_0033_D.mp4", kind: "video", durationInFrames: 30, startFrom: 50,  move: "left", speed: 1.1,  accent: BRAND.oxygen },
  { id: "b07-tank",    file: "24-DJI_20260905124227_0023_D.mp4", kind: "video", durationInFrames: 30, startFrom: 75,  move: "push", speed: 1.15, accent: BRAND.pulse },
  { id: "b08-ports",   file: "30-DJI_20260905124720_0035_D.mp4", kind: "video", durationInFrames: 30, startFrom: 40,  move: "left", speed: 1.1,  accent: BRAND.pulse },
  { id: "b09-inside",  file: "11-6E8A6402.mp4",                  kind: "video", durationInFrames: 28, startFrom: 50,  move: "push", accent: BRAND.pulse },
  { id: "b10-chair",   file: "17-6E8A6408.mp4",                  kind: "video", durationInFrames: 28, startFrom: 75,  move: "push", accent: BRAND.pulse },
  { id: "b11-detail",  file: "12-6E8A6403.mp4",                  kind: "video", durationInFrames: 26, startFrom: 700, move: "pull", accent: BRAND.pulse },
  { id: "b12-top",     file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 30, startFrom: 120, move: "pull", speed: 1.2,  accent: BRAND.oxygen },
  { id: "b13-fields",  file: "23-DJI_20260905124037_0022_D.mp4", kind: "video", durationInFrames: 32, startFrom: 900, move: "push", speed: 1.2,  accent: BRAND.oxygen },
  // Ends wide and rising, which is also where it can loop back to the
  // cobbles without the join reading as a jump.
  { id: "b14-away",    file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 69, startFrom: 250, move: "pull", speed: 1.1,  accent: BRAND.oxygen },
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
  // Opens on metal and portholes, close enough that it could be a
  // submarine or a fuel tanker. That is the point: the question has to
  // outlast the first second.
  { id: "a01-ports",   file: "30-DJI_20260905124720_0035_D.mp4", kind: "video", durationInFrames: 28, startFrom: 40,  move: "left", accent: BRAND.oxygen },
  // The pull-out answers it - and the Normocare branding and the
  // cyclists arrive in the same frame.
  { id: "a02-reveal",  file: "24-DJI_20260905124227_0023_D.mp4", kind: "video", durationInFrames: 32, startFrom: 75,  move: "pull", speed: 1.15, accent: BRAND.oxygen },
  { id: "a03-top",     file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 28, startFrom: 120, move: "push", speed: 1.15, accent: BRAND.oxygen },
  { id: "a04-inside",  file: "11-6E8A6402.mp4",                  kind: "video", durationInFrames: 30, startFrom: 50,  move: "push", accent: BRAND.oxygen },
  { id: "a05-seats",   file: "08-6E8A6399.mp4",                  kind: "video", durationInFrames: 30, startFrom: 300, move: "pull", accent: BRAND.oxygen },
  { id: "a06-chair",   file: "17-6E8A6408.mp4",                  kind: "video", durationInFrames: 32, startFrom: 75,  move: "push", accent: BRAND.pulse },

  // ── 7.2s — THE TURN ──────────────────────────────────────────
  // Music drops away and she speaks. One clean sentence, the only
  // genuinely unique fact in the whole brief, and it lands better in
  // her voice than as another caption. Everything before this is
  // wordless, which is what makes the cut to a voice register.
  { id: "a07-voice",   file: "08-6E8A6399.mp4", kind: "video", durationInFrames: 88, startFrom: 2455, audible: true, accent: BRAND.oxygen,
    subtitles: [
      { from: 0,  to: 44, text: "De zuurstofkamer is de enige" },
      { from: 44, to: 88, text: "in de Benelux." },
    ] },

  // ── 10.7s — back to music ────────────────────────────────────
  { id: "a08-detail",  file: "12-6E8A6403.mp4",                  kind: "video", durationInFrames: 26, startFrom: 700, move: "pull", accent: BRAND.pulse },
  { id: "a09-cobbles", file: "20-DJI_20260905112103_0014_D.mp4", kind: "video", durationInFrames: 30, startFrom: 25,  move: "push", speed: 1.2, accent: BRAND.cobble },
  { id: "a10-hotel",   file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 32, startFrom: 250, move: "pull", speed: 1.15, accent: BRAND.oxygen },
  { id: "a11-arrive",  file: "27-DJI_20260905124432_0031_D.mp4", kind: "video", durationInFrames: 30, startFrom: 150, move: "push", speed: 1.15, accent: BRAND.oxygen },
  { id: "a12-away",    file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 42, startFrom: 250, move: "pull", speed: 1.1,  accent: BRAND.oxygen },
];

/**
 * ── THE EXPLAINER (vertical) ──────────────────────────────────
 * For people who have never heard of any of this. It has to land what
 * it is, why it exists and who it is for, in twenty seconds, with the
 * sound off, and leave them wanting the landing page.
 *
 * Fien is in frame but never speaking: the text carries the argument,
 * so nothing depends on how a sentence was delivered on the day.
 *
 * Beats run about three and a half seconds each - short enough to keep
 * moving, long enough to actually read two lines.
 */
export const SHOTS_EXPLAINER: Shot[] = [
  // ── HOOK (0.0s – 2.2s) — four cuts, two outside and two inside.
  // One held shot gives a stranger nothing to be curious about.
  { id: "x1a-ports",  file: "30-DJI_20260905124720_0035_D.mp4", kind: "video", durationInFrames: 14, startFrom: 40,  move: "left",  accent: BRAND.oxygen },
  { id: "x1b-top",    file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 14, startFrom: 120, move: "push",  accent: BRAND.oxygen },
  { id: "x1c-tube",   file: "11-6E8A6402.mp4",                  kind: "video", durationInFrames: 14, startFrom: 40,  move: "push",  accent: BRAND.oxygen },
  { id: "x1d-seats",  file: "08-6E8A6399.mp4",                  kind: "video", durationInFrames: 14, startFrom: 300, move: "pull",  accent: BRAND.oxygen },

  // ── Every beat below runs across TWO shots. A line of text held over
  // a single locked shot for three and a half seconds is where
  // attention goes to die; the words stay put and the pictures change
  // under them.

  // WHAT IT IS (2.2s – 5.7s)
  { id: "x2a-brand",  file: "24-DJI_20260905124227_0023_D.mp4", kind: "video", durationInFrames: 44, startFrom: 75,  move: "pull",  accent: BRAND.oxygen },
  { id: "x2b-reveal", file: "23-DJI_20260905124037_0022_D.mp4", kind: "video", durationInFrames: 44, startFrom: 300, move: "push",  accent: BRAND.oxygen },

  // WHAT FOR (5.7s – 9.2s)
  { id: "x3a-chair",  file: "17-6E8A6408.mp4",                  kind: "video", durationInFrames: 44, startFrom: 75,  move: "push",  accent: BRAND.oxygen },
  { id: "x3b-vip",    file: "14-6E8A6405.mp4",                  kind: "video", durationInFrames: 44, startFrom: 50,  move: "pull",  accent: BRAND.oxygen },

  // HOW IT GOES (9.2s – 12.7s)
  { id: "x4a-detail", file: "12-6E8A6403.mp4",                  kind: "video", durationInFrames: 44, startFrom: 700, move: "pull",  accent: BRAND.pulse },
  { id: "x4b-seat",   file: "16-6E8A6407.mp4",                  kind: "video", durationInFrames: 44, startFrom: 400, move: "push",  accent: BRAND.pulse },

  // FOR WHOM (12.7s – 16.2s)
  { id: "x5a-riders", file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 44, startFrom: 300, move: "pull",  speed: 1.15, accent: BRAND.pulse },
  { id: "x5b-arrive", file: "27-DJI_20260905124432_0031_D.mp4", kind: "video", durationInFrames: 44, startFrom: 150, move: "push",  speed: 1.15, accent: BRAND.pulse },

  // THE ONLY ONE (16.2s – 18.1s)
  { id: "x6a-hotel",  file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 22, startFrom: 250, move: "pull",  speed: 1.15, accent: BRAND.oxygen },
  { id: "x6b-away",   file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 22, startFrom: 250, move: "pull",  speed: 1.1,  accent: BRAND.oxygen },
];

export type Film = {
  id: string;
  label: string;
  format: "vertical" | "wide";
  shots: Shot[];
  energy: "high" | "calm";
  /** Keyed by shot id. A shot with no entry runs without type. */
  captions: Record<string, { caption: string; sub?: string }>;
  /**
   * Full-frame text beats, keyed by shot id. Where captions decorate a
   * shot, a card IS the shot's content and the picture behind it is
   * atmosphere. Used by the explainer cut.
   */
  cards?: Record<string, { kicker?: string; title: string; body?: string }>;
  /**
   * Null on a film with no end card. A website header loops, and a
   * call to action sailing past every twenty seconds under the site's
   * own headline is noise.
   */
  endCard: {
    durationInFrames: number;
    wordmark: string;
    line: string;
    venue: string;
    cta: string;
  } | null;
  /**
   * Text beats that run across several shots rather than sitting on
   * one. The opening montage needs a single line held over four quick
   * cuts; a per-shot card would re-animate on every one of them.
   */
  overlays?: Array<{
    from: number;
    durationInFrames: number;
    card: { kicker?: string; title: string; body?: string };
  }>;
  /**
   * Frames of fade from and to black at the two ends. A header video
   * loops, and a hard cut from the last frame back to the first reads
   * as a glitch; fading both ends makes the join invisible.
   */
  loopFade?: number;
};

const CTA = "flanderscobblestoneparadise.be";

export const FILMS: Record<string, Film> = {
  /**
   * The header loop. No type and no end card on purpose: this plays
   * behind the site's own headline, so anything we put on it collides
   * with the words the page already has. Both ends fade to black so
   * the loop join is invisible.
   */
  "brand-wide": {
    id: "brand-wide",
    label: "Flanders Cobblestone - website header loop (16:9)",
    format: "wide",
    shots: SHOTS_BRAND,
    energy: "high",
    loopFade: 12,
    captions: {},
    endCard: null,
  },

  /**
   * The same cut with words on it, for anywhere that is not sitting
   * under a headline - YouTube, a pitch, a social post.
   */
  "brand-wide-titled": {
    id: "brand-wide-titled",
    label: "Flanders Cobblestone - titled (16:9)",
    format: "wide",
    shots: SHOTS_BRAND,
    energy: "high",
    captions: {
      "b01-cobbles": { caption: "DE VLAAMSE ARDENNEN" },
      "b05-hotel":   { caption: "FLANDERS COBBLESTONE" },
      "b07-tank":    { caption: "DE ZUURSTOFKAMER", sub: "De enige in de Benelux" },
      "b14-away":    { caption: "RIJD HARD. RUST HARDER." },
    },
    // No extra frames: the shots already add to twenty seconds, and the
    // words ride over them rather than after them.
    endCard: null,
  },

  /** The campaign film. Music, then her voice at 7.2s, then music. */
  "ad-nl": {
    id: "ad-nl",
    label: "Zuurstofkamer - Meta/TikTok (9:16)",
    format: "vertical",
    shots: SHOTS_AD,
    energy: "high",
    captions: {
      "a01-ports":   { caption: "WAT IS DIT?" },
      "a02-reveal":  { caption: "EEN ZUURSTOFKAMER" },
      "a06-chair":   { caption: "TWEE UUR", sub: "Een stoel. Meer niet." },
      // Nothing over a07: she is speaking, and her words are already
      // on screen as subtitles.
      "a10-hotel":   { caption: "VLAAMSE ARDENNEN" },
    },
    endCard: {
      durationInFrames: 72,
      wordmark: "FLANDERS",
      line: "COBBLESTONE PARADISE",
      venue: "De zuurstofkamer - de enige in de Benelux",
      cta: CTA,
    },
  },
};

FILMS["ad-explainer-nl"] = {
  id: "ad-explainer-nl",
  label: "Zuurstofkamer - uitleg, tekst (9:16)",
  format: "vertical",
  shots: SHOTS_EXPLAINER,
  energy: "high",
  captions: {},
  overlays: [
    { from: 0,   durationInFrames: 56, card: { title: "Wat is dit?" } },
    { from: 56,  durationInFrames: 88, card: {
      kicker: "Wat het is",
      title: "Een zuurstofkamer",
      body: "Je ademt er bijna twee keer zoveel zuurstof in als buiten.",
    } },
    { from: 144, durationInFrames: 88, card: {
      kicker: "Waarvoor",
      title: "Om te herstellen",
      body: "Na een zware rit. Of na een zware week.",
    } },
    { from: 232, durationInFrames: 88, card: {
      kicker: "Hoe het gaat",
      title: "Twee uur. Een stoel.",
      body: "Geen masker, niets aan. Je zit, je leest, je rust.",
    } },
    { from: 320, durationInFrames: 88, card: {
      kicker: "Voor wie",
      title: "Renners, groepen, bedrijven",
      body: "En voor wie gewoon eens iets voor zichzelf wil doen.",
    } },
    { from: 408, durationInFrames: 44, card: { title: "De enige in de Benelux" } },
  ],
  cards: {},
  endCard: {
    durationInFrames: 48,
    wordmark: "FLANDERS",
    line: "COBBLESTONE PARADISE",
    venue: "Zegelsem, Brakel - Vlaamse Ardennen",
    cta: CTA,
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
  film.shots.reduce((n, s) => n + s.durationInFrames, 0) +
  (film.endCard?.durationInFrames ?? 0);

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
