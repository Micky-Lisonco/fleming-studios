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
    // Sized for a phone held at arm's length, not for a desktop
    // preview, and sized to FILL the frame rather than to fit a line.
    // Headlines run to two or three lines at this size; that is the
    // point. Type this large is what reads as someone speaking to you
    // rather than as a caption sitting politely under a picture.
    captionSize: 196, captionSizeLong: 168, subSize: 78,
    // Clear of the bottom fifth, where Reels and TikTok put their own UI.
    captionBottom: 360, sidePad: 64,
    logoWidth: 560, wordmarkSize: 124,
  },
  wide: {
    width: 1920, height: 1080,
    captionSize: 148, captionSizeLong: 124, subSize: 60,
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

/** The active media folder for a project: public/<project>/<MEDIA_DIR>. */
const mediaRoot = (project?: string): string =>
  project ? `${project}/${MEDIA_DIR}` : MEDIA_DIR;

/** Resolves a bare filename against whichever media folder is active. */
export const resolveMedia = (file: string, project?: string): string =>
  `${mediaRoot(project)}/${file}`;

/**
 * The file a shot plays, in whichever mode is active.
 *
 * Stills are the exception: they live in public/images, they are
 * already final, and there is no master to conform them from - so they
 * resolve the same way in every mode.
 */
export const shotSource = (shot: Shot): string | null => {
  if (shot.kind === "image") return shot.file ? `images/${shot.file}` : null;
  if (CONFORMED) return resolveMedia(`${shot.id}.mp4`, shot.project);
  return shot.file ? resolveMedia(shot.file, shot.project) : null;
};

/** Marks every shot in a list as belonging to one client project. */
export const inProject = (project: string, shots: Shot[]): Shot[] =>
  shots.map((s) => ({ ...s, project }));

/**
 * Where playback starts inside that file. A conformed clip has the trim
 * already applied, so seeking into it again would skip past the moment
 * the shot was chosen for.
 */
export const shotStartFrom = (shot: Shot): number =>
  shot.kind === "image" ? 0 : CONFORMED ? 0 : (shot.startFrom ?? 0);

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
   * What this slot is for, shown on the placeholder until footage is
   * assigned - so a skeleton edit reads as a shot list, not as numbered
   * grey boxes.
   */
  note?: string;
  /**
   * Client project the footage belongs to, e.g. "elite". Its proxies and
   * conformed clips live in public/<project>/, so two clients' footage
   * never shares a folder. Unset for Normocare, which predates projects
   * and lives directly in public/. Stamp a whole list with inProject().
   */
  project?: string;
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
  /**
   * How the file fills the frame. "cover" crops, "contain" letterboxes.
   * Always "cover" in the delivered films: Michael wants the full screen
   * used at every moment. Use `pan` to show something wider than the
   * vertical slice.
   */
  fit?: "cover" | "contain";
  /**
   * Horizontal pan across a horizontal source cropped to 9:16, as CSS
   * object-position x in percent, from start to end of the shot: [18, 68]
   * travels from the left of the picture towards the right. A vertical
   * slice keeps about a third of a 16:9 frame, which cuts a fifteen-metre
   * chamber in half; panning shows all of it and keeps the screen full.
   * Overrides the x part of `focus`.
   */
  pan?: [number, number];
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
  /**
   * Colour grade, applied in the renderer as an SVG filter in sRGB, so
   * the Studio preview and the delivered file get the same look without
   * re-cutting proxies or re-conforming masters. In order:
   *   gamma       per-channel exponent; below 1 lifts shadows and mids
   *               while leaving highlights where they are - the fix for
   *               a subject standing dark against a bright window
   *   contrast    slope around mid-grey
   *   saturation  SVG saturate(): 1 unchanged, 1.5 half again
   *   warmth      red up and blue down by the same factor; 1 is neutral
   */
  grade?: {
    gamma: number;
    contrast: number;
    saturation: number;
    warmth: number;
    /**
     * Full tone curve, evenly spaced output values from input 0 to 1.
     * When present it replaces gamma and contrast: a curve can set the
     * black and white points and add an S for contrast in one step,
     * which a gamma lift cannot - lifting with gamma alone raises the
     * blacks with everything else and leaves the picture milky.
     */
    curve?: number[];
  };
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
  /**
   * Rebuilt against the contact sheets and the rulings the explainer
   * already went through. The first cut of this ad predated all of them:
   * it asked "wat is dit?", called the recliner "een stoel", opened on
   * the tightest porthole shot, put Fien in five of twelve shots and
   * played 3.5s of her interview - audio that was ruled out, and that
   * the safe render mutes anyway, which left a silent talking head.
   *
   * Music-led: four lines of type across seventeen seconds, and the
   * pictures carry the rest. Fien is in one shot.
   */

  // ── WHAT IT IS (0.0s - 3.5s) - far, overhead, close. Full screen: the
  // far shot pans along the chamber rather than letterboxing it.
  { id: "a01-far",     file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 34, startFrom: 150, pan: [18, 68], punch: false, accent: BRAND.oxygen },
  { id: "a02-scale",   file: "24-DJI_20260905124227_0023_D.mp4", kind: "video", durationInFrames: 30, startFrom: 60,  focus: "23% 50%", accent: BRAND.oxygen },
  { id: "a03-ports",   file: "30-DJI_20260905124720_0035_D.mp4", kind: "video", durationInFrames: 24, startFrom: 40,  focus: "82% 50%", move: "left", accent: BRAND.oxygen },

  // ── INSIDE (3.5s - 7.2s) - the empty room, then the row of chairs
  // down the length of the tube.
  { id: "a04-inside",  file: "06-6E8A6397.mp4",                  kind: "video", durationInFrames: 30, startFrom: 55,  focus: "57% 50%", move: "push", accent: BRAND.oxygen },
  { id: "a05-row",     file: "05-6E8A6396.mp4",                  kind: "video", durationInFrames: 30, startFrom: 250, focus: "38% 50%", move: "pull", accent: BRAND.oxygen },

  // ── THE CHAIR (7.2s - 11.8s) - the recliner on its own, then Fien
  // sinking into one: the only shot of her, and the one where she is
  // doing what the words say. Then a deep breath and a climb (approved
  // generated stills) where the control panel and a dark porthole were,
  // and the normocare headrest.
  { id: "a06-chair",   file: "07-6E8A6398.mp4",                  kind: "video", durationInFrames: 32, startFrom: 40,  focus: "72% 50%", move: "push", accent: BRAND.pulse },
  { id: "a07-sit",     file: "12-6E8A6403.mp4",                  kind: "video", durationInFrames: 30, startFrom: 700, move: "pull", accent: BRAND.pulse },
  { id: "a08-breath",  file: "breath-a.png",                     kind: "image", durationInFrames: 30, move: "pull", accent: BRAND.pulse },
  { id: "a09-energy",  file: "energy-a.png",                     kind: "image", durationInFrames: 28, move: "push", accent: BRAND.pulse },
  { id: "a10-detail",  file: "18-6E8A6409.mp4",                  kind: "video", durationInFrames: 26, startFrom: 120, move: "pull", accent: BRAND.pulse },

  // ── WHERE (11.8s - 17.1s) - the cobbles, the hotel, the way in, away.
  { id: "a11-cobbles", file: "20-DJI_20260905112103_0014_D.mp4", kind: "video", durationInFrames: 30, startFrom: 25,  move: "push", speed: 1.2, accent: BRAND.cobble },
  { id: "a12-hotel",   file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 32, startFrom: 250, move: "pull", speed: 1.15, accent: BRAND.oxygen },
  { id: "a13-arrive",  file: "27-DJI_20260905124432_0031_D.mp4", kind: "video", durationInFrames: 30, startFrom: 150, move: "push", speed: 1.15, accent: BRAND.oxygen },
  { id: "a14-away",    file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 42, startFrom: 250, move: "pull", speed: 1.1,  accent: BRAND.oxygen },
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
  /**
   * Nothing generated is set inside the chamber: every invented
   * interior read as a waiting room next to the real one, and the real
   * one is the entire product.
   *
   * The rest is chosen off the contact sheets rather than off the
   * filenames. Nineteen of the thirty clips are Fien talking to camera,
   * which is how she ended up in five shots of a film with no speech in
   * it; the ones that are not - the empty row of chairs, the aisle, the
   * recliner - show the product, and they now carry it.
   *
   * Four generated stills in all, none of them inside the chamber: two
   * cyclists, a deep breath, and someone full of energy on a climb.
   */

  // ── 1. WHAT IT IS (0.0s - 2.8s)
  //
  // Three cameras, far to close, because the first question anyone has
  // is how big it is. This beat used to be clip 30 twice - the tightest
  // coverage on the shoot - so the film opened by zooming in on the one
  // thing it needed to stand back from.
  //
  // Full screen throughout - Michael ruled out the letterbox. The chamber
  // is roughly fifteen metres of horizontal object and a 9:16 slice of a
  // 16:9 frame keeps about a third of its width, so the far shot pans
  // along it instead: the whole length, and the screen stays full. The
  // other two are framed on something that reads in a vertical slice -
  // the normocare logo, then one porthole.
  { id: "e01-far",    file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 30, startFrom: 150, pan: [18, 68], punch: false, accent: BRAND.oxygen },
  { id: "e02-scale",  file: "24-DJI_20260905124227_0023_D.mp4", kind: "video", durationInFrames: 22, startFrom: 60,  focus: "23% 50%", accent: BRAND.oxygen },
  { id: "e03-ports",  file: "30-DJI_20260905124720_0035_D.mp4", kind: "video", durationInFrames: 18, startFrom: 40,  focus: "82% 50%", move: "left", accent: BRAND.oxygen },

  // ── 2. THE OXYGEN (2.8s - 5.6s)
  //
  // Outside to inside, then a breath. The interior is empty on purpose -
  // it is the room being sold, not an interview. The control panel that
  // used to follow read, in a vertical slice, as an unidentifiable
  // close-up, so it gave way to an approved generated image.
  // e04 was 4.8s into this clip, where the vertical slice is the edge
  // of a table and a window - "zoomed in on something". 2.2s in is the
  // aisle: seats down both sides of the tube.
  { id: "e04-inside", file: "06-6E8A6397.mp4",                  kind: "video", durationInFrames: 35, startFrom: 55,  focus: "57% 50%", move: "push", accent: BRAND.oxygen },
  // Generated, approved by Michael: the control screen it replaces was
  // unreadable in a vertical slice - "zoomed in on something".
  { id: "e05-breath", file: "breath-a.png",                     kind: "image", durationInFrames: 35, move: "pull", accent: BRAND.oxygen },

  // ── 3. THE CHAIR (5.6s - 8.4s) - the empty recliner first, then the
  // only shot of Fien left in the film. She earns this one: the card
  // says "wegzakken in een massagestoel" and she is the person doing
  // it. Five appearances in a film with no speech was four too many.
  { id: "e06-chair",  file: "07-6E8A6398.mp4",                  kind: "video", durationInFrames: 35, startFrom: 40,  focus: "72% 50%", move: "push", accent: BRAND.pulse },
  { id: "e07-sit",    file: "12-6E8A6403.mp4",                  kind: "video", durationInFrames: 35, startFrom: 700, move: "pull", accent: BRAND.pulse },

  // ── 4. FOR RIDERS (8.4s - 11.2s) - a cyclist riding, plainly. The
  // one subject the shoot has no footage of.
  { id: "e08-ride",   file: "cyclist-road.png",                 kind: "image", durationInFrames: 35, move: "push", accent: BRAND.cobble },
  { id: "e09-climb",  file: "cyclist-climb.png",                kind: "image", durationInFrames: 35, move: "pull", accent: BRAND.cobble },

  // ── 5. GROUPS AND COMPANIES (11.2s - 13.6s) - the empty row of
  // chairs running the length of the tube. It says "zeventien
  // plaatsen" without being told to. This slot used to hold a close-up
  // of Fien's face, which said nothing about seventeen of anything.
  // 10s in, not 4.8s: earlier the vertical slice is the metal door frame.
  { id: "e10-row",    file: "05-6E8A6396.mp4",                  kind: "video", durationInFrames: 30, startFrom: 250, focus: "38% 50%", move: "push", accent: BRAND.oxygen },
  { id: "e11-hotel",  file: "26-DJI_20260905124317_0025_D.mp4", kind: "video", durationInFrames: 30, startFrom: 250, move: "pull", speed: 1.15, accent: BRAND.oxygen },

  // ── 6. EVERYONE ELSE (13.6s - 16.4s) - the card says everybody, so
  // the picture should have people in it. The drone pulls back off the
  // portholes to the whole chamber standing in the square with a crowd
  // and a rack of bikes around it, then someone out in the Ardennes
  // with energy to spare.
  { id: "e12-crowd",  file: "23-DJI_20260905124037_0022_D.mp4", kind: "video", durationInFrames: 35, startFrom: 1150, pan: [4, 44], punch: false, accent: BRAND.pulse },
  // Generated, approved by Michael: someone of 55 full of energy on a
  // cobbled climb. Replaces a porthole shot that was mostly black.
  { id: "e13-energy", file: "energy-a.png",                     kind: "image", durationInFrames: 35, move: "push", accent: BRAND.pulse },

  // ── 7. THE ONLY ONE (16.4s - 18.4s)
  { id: "e14-away",   file: "29-DJI_20260905124542_0034_D.mp4", kind: "video", durationInFrames: 25, startFrom: 250, move: "pull", speed: 1.1, accent: BRAND.oxygen },
  { id: "e15-place",  file: "22-DJI_20260905112604_0021_D.mp4", kind: "video", durationInFrames: 25, startFrom: 200, move: "push", speed: 1.1, accent: BRAND.oxygen },
];

export type Film = {
  id: string;
  label: string;
  format: "vertical" | "wide";
  shots: Shot[];
  /**
   * "fast": cuts every second or less, with a 2-frame overlap - enough to
   * hide a late decode, short enough to read as a hard cut.
   */
  energy: "high" | "calm" | "fast";
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
    /** Per-film brand. Unset falls back to the Cobblestone look. */
    logo?: string | null;
    accent?: string;
    background?: string;
    fontFamily?: string;
    /**
     * "screen" blends a logo supplied as a JPEG on black into a dark
     * card; "normal" for a transparent PNG, which screen would wash out.
     */
    logoBlend?: "screen" | "normal";
    /** Text colour, for a light card. Unset: white on dark. */
    ink?: string;
  } | null;
  /**
   * No vignette and no bottom scrim. For a website header background:
   * the page lays its own headline and its own overlay on top, and a
   * second darkening baked into the video makes the header muddy.
   */
  plain?: boolean;
  /** Intended length. Defaults to TARGET_FRAMES; only used to warn. */
  targetFrames?: number;
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
      // Was "RUST HARDER" - rest framing, which Michael ruled out: the
      // room is about recovery, not about resting. "Herstel hier" says
      // recovery without promising how fast.
      "b14-away":    { caption: "RIJD HARD. HERSTEL HIER." },
    },
    // No extra frames: the shots already add to twenty seconds, and the
    // words ride over them rather than after them.
    endCard: null,
  },

  /** The campaign film. Music-led: pictures first, four lines of type. */
  "ad-nl": {
    id: "ad-nl",
    label: "Zuurstofkamer - Meta/TikTok (9:16)",
    format: "vertical",
    shots: SHOTS_AD,
    energy: "high",
    // Statements, not questions - "wat is dit?" was ruled out - and the
    // lines Michael already approved in the explainer, so the two ads
    // say the same thing in the same words.
    captions: {
      "a01-far":     { caption: "ZUURSTOFKAMER", sub: "De enige in de Benelux." },
      "a04-inside":  { caption: "TWEE KEER ZOVEEL ZUURSTOF", sub: "Als in de lucht buiten." },
      "a06-chair":   { caption: "WEGZAKKEN IN EEN MASSAGESTOEL", sub: "Twee uur voor jezelf." },
      "a12-hotel":   { caption: "VLAAMSE ARDENNEN" },
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
    // "ZUURSTOFKAMER" is thirteen characters of one unbreakable word,
    // so as part of a longer headline it dragged the whole line down to
    // about 150px while shorter beats ran at 196. Making the word
    // itself the headline lets it run edge to edge at full size, and
    // the rest of the sentence becomes the kicker above it.
    { from: 0,   durationInFrames: 70, card: {
      kicker: "Dit is een",
      title: "Zuurstofkamer",
    } },
    { from: 70,  durationInFrames: 70, card: {
      title: "Twee keer zoveel zuurstof",
      body: "Als in de lucht buiten.",
    } },
    // Was "Twee uur in een stoel", which undersells a heated massage
    // recliner with a reading lamp next to it. Say how it feels, and
    // show the real chair while saying it.
    { from: 140, durationInFrames: 70, card: {
      title: "Wegzakken in een massagestoel",
      // No coffee: it has been taken out of the chamber - people spilled
      // it on the chairs.
      body: "Twee uur voor jezelf.",
    } },
    { from: 210, durationInFrames: 70, card: {
      kicker: "Voor wie",
      title: "Renners",
      body: "Na een zware rit.",
    } },
    { from: 280, durationInFrames: 60, card: {
      kicker: "Voor wie",
      title: "Groepen en bedrijven",
      body: "Zeventien plaatsen.",
    } },
    // The broadening beat, and the longest line in the film, so it is
    // given ten frames back off the short beat before it.
    //
    // Was "Iedereen die toe is aan rust", which framed the room as a
    // nap. It is not - the pitch is physical: twice the oxygen, and
    // what that does for a body. "Rust" also narrows the audience to
    // people who are tired, where "lichamelijk beter voelen" is
    // very nearly everybody. Still inside the client's language:
    // herstel, energie, prestatie, and no condition named.
    { from: 340, durationInFrames: 70, card: {
      kicker: "Voor wie",
      title: "Iedereen die zich lichamelijk beter wil voelen",
      body: "Herstel en energie.",
    } },
    { from: 410, durationInFrames: 50, card: {
      title: "De enige in de Benelux",
      body: "Zegelsem, Brakel.",
    } },
  ],
  cards: {},
  endCard: {
    durationInFrames: 40,
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

/**
 * Frames of crossfade between shots.
 *
 * Three frames at 25fps is 0.12s - too short to read as a dissolve, so
 * it lands as a hard cut with a hint of judder rather than a join. Six
 * is still fast enough to feel like cutting rather than fading, but
 * long enough that consecutive shots connect instead of snapping.
 */
export const crossfadeFor = (film: Film): number =>
  film.energy === "calm" ? 10 : film.energy === "fast" ? 2 : 6;

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

/**
 * ── ELITE CLEANING ────────────────────────────────────────────
 * Second client: Tino, Elite Cleaning, Geraardsbergen (elitecleaning.be).
 * Brand from the Elite Cleaning project knowledge document.
 *
 * Copy rules, binding: Flemish Belgian Dutch, never Netherlands Dutch;
 * "je/jij", not "u"; no em dashes anywhere; social proof is always
 * "honderden klanten", never a number. Real footage of Tino at work is
 * the brand's strongest asset, so generated images are the exception.
 *
 * Two films:
 *   elite-header-wide  the website header behind elitecleaning.be, 16:9.
 *                      No text, no sound (the site sets its own headline,
 *                      and browsers only autoplay muted video), and it
 *                      loops, so both ends fade. Elite only: no hotel, no
 *                      chamber, no Cobblestone banners.
 *   elite-ad           the advert, 9:16. Tino's voice goes over it later,
 *                      so it is cut with room for that. The hotel and the
 *                      oxygen chamber may appear, briefly - it is where he
 *                      works, not what the ad is about.
 *
 * Shot choices come from the contact sheets (out/elite/lookbook). Canon
 * clips are 50p and the drone 25p; startFrom is in timeline frames at 25
 * fps either way, so seconds x 25.
 */
export const ELITE = {
  navy: "#0b1e3d",
  blue: "#2563c7",
  sky: "#4fa3e0",
  skyLight: "#e8f4fd",
  gold: "#f0a500",
  white: "#ffffff",
} as const;

/** Loaded by fonts.ts wherever the video is drawn. */
export const ELITE_FONT = 'Nunito, "Nunito Sans", system-ui, sans-serif';

const HEADER_FRAMES = 20 * FPS; // 500: room for every usable moment at the pace Michael wants

/**
 * Grade. The footage measures a saturation of 4-8 on the Canon (20-40 is
 * normal) and the interiors are backlit, so Tino stands dark against the
 * windows: lift shadows and mids with gamma rather than raising brightness
 * (which would blow the windows out), add contrast, and give the colour
 * back. Checked on real frames before going in.
 */
export const ELITE_GRADE = {
  indoor:  { gamma: 0.70, contrast: 1.12, saturation: 1.75, warmth: 1.03 },
  outdoor: { gamma: 0.85, contrast: 1.12, saturation: 1.5,  warmth: 1.02 },
  drone:   { gamma: 0.90, contrast: 1.10, saturation: 1.3,  warmth: 1.0 },
} as const;

/**
 * Every in-point sits exactly on a contact-sheet frame (frame k of a clip
 * of length D is taken at k x D / 6.5 seconds), so what each shot opens on
 * has been seen, not guessed. Shots are 0.7-1.1s: Michael wants it fast.
 * Clip numbers are the Elite ones (out/elite/lookbook).
 */
const S = {
  road:     { file: "26-DJI_20260905112014_0013_D.mp4", startFrom: 182,   speed: 1.5, grade: ELITE_GRADE.drone },   // low along the cobbles
  cobbles:  { file: "27-DJI_20260905112103_0014_D.mp4", startFrom: 0,     speed: 1.4, grade: ELITE_GRADE.drone },   // cobbled street, road sign
  sign:     { file: "27-DJI_20260905112103_0014_D.mp4", startFrom: 125,   speed: 1.4, grade: ELITE_GRADE.drone },   // the street with the hotel sign
  road2:    { file: "26-DJI_20260905112014_0013_D.mp4", startFrom: 547,   speed: 1.5, grade: ELITE_GRADE.drone },   // further along the road
  street:   { file: "18-6E8A6388.mp4",                  startFrom: 9,                 grade: ELITE_GRADE.outdoor }, // street, cyclists
  vanAir:   { file: "22-DJI_20260905111306_0009_D.mp4", startFrom: 156,   speed: 1.5, grade: ELITE_GRADE.drone },   // the van drives in, from the air
  van:      { file: "11-6E8A6381.mp4",                  startFrom: 0,                 grade: ELITE_GRADE.outdoor }, // the van, on the ground
  out:      { file: "11-6E8A6381.mp4",                  startFrom: 138,               grade: ELITE_GRADE.outdoor }, // Tino steps out
  ladderOff:{ file: "11-6E8A6381.mp4",                  startFrom: 276,               grade: ELITE_GRADE.outdoor }, // takes the ladder off the roof
  atVan:    { file: "11-6E8A6381.mp4",                  startFrom: 413,               grade: ELITE_GRADE.outdoor }, // at the van
  vanRear:  { file: "11-6E8A6381.mp4",                  startFrom: 551,               grade: ELITE_GRADE.outdoor }, // reaching up at the back of the van
  carry:    { file: "11-6E8A6381.mp4",                  startFrom: 689,               grade: ELITE_GRADE.outdoor }, // walks in with the ladder on his shoulder
  hotel:    { file: "30-DJI_20260905124317_0025_D.mp4", startFrom: 321,   speed: 1.3, grade: ELITE_GRADE.drone },   // the hotel from the air
  hero:     { file: "24-DJI_20260905111438_0011_D.mp4", startFrom: 0,     speed: 1.3, grade: ELITE_GRADE.drone },   // Tino at the entrance, top-down
  walkIn:   { file: "01-6E8A6371.mp4",                  startFrom: 92,                grade: ELITE_GRADE.indoor },  // through the door with his bucket
  room:     { file: "04-6E8A6374.mp4",                  startFrom: 247,               grade: ELITE_GRADE.indoor },  // in the room
  window:   { file: "03-6E8A6373.mp4",                  startFrom: 263,               grade: ELITE_GRADE.indoor },  // at the window
  glass:    { file: "06-6E8A6376.mp4",                  startFrom: 0,                 grade: ELITE_GRADE.indoor },  // outside the big glass
  reflect:  { file: "02-6E8A6372.mp4",                  startFrom: 9748,              grade: ELITE_GRADE.indoor },  // grinning at the window, 390s in
  window2:  { file: "05-6E8A6375.mp4",                  startFrom: 263,               grade: ELITE_GRADE.indoor },  // at the window, other room
  crouch:   { file: "02-6E8A6372.mp4",                  startFrom: 0,                 grade: ELITE_GRADE.indoor },  // crouched, the bottom of the window
  leaves:   { file: "07-6E8A6377.mp4",                  startFrom: 600,               grade: ELITE_GRADE.outdoor }, // through the leaves, at the entrance (banners: advert only)
  solar:    { file: "33-DJI_20260905124519_0033_D.mp4", startFrom: 91,    speed: 1.3, grade: ELITE_GRADE.drone },   // roof of solar panels, close
  solarAir: { file: "34-DJI_20260905124542_0034_D.mp4", startFrom: 345,   speed: 1.3, grade: ELITE_GRADE.drone },   // roofs of solar panels, from higher
  churchAir:{ file: "28-DJI_20260905112207_0020_D.mp4", startFrom: 151,   speed: 1.3, grade: ELITE_GRADE.drone },   // church and fields
  // Someone in a red hoodie stands at the left of this frame - vertical
  // slice only, where he is out of shot.
  glass2:   { file: "06-6E8A6376.mp4",                  startFrom: 719,               grade: ELITE_GRADE.indoor },  // behind the glass, other side
  rise:     { file: "25-DJI_20260905111509_0012_D.mp4", startFrom: 111,   speed: 1.3, grade: ELITE_GRADE.drone },   // drone rising off Tino
  church:   { file: "29-DJI_20260905112604_0021_D.mp4", startFrom: 617,   speed: 1.3, grade: ELITE_GRADE.drone },   // village church
  village:  { file: "27-DJI_20260905112103_0014_D.mp4", startFrom: 250,   speed: 1.4, grade: ELITE_GRADE.drone },   // rising over the street
};

// <elite-grades> Written by scripts/grade-shots.py - regenerate, do not edit by hand.
/**
 * One grade per shot, solved so every shot lands on the same brightness
 * and colour: the median luma of what the viewer sees goes to 132, the
 * darkest fifth is lifted to at least 78 (what brings Tino out from
 * against a window), and saturation goes to 92. Measured on the exact
 * frame each shot opens on, and for the 9:16 advert on the vertical slice
 * only. Result: median luma 131-172 across the header and 123-175 across
 * the advert, from 33-197 before.
 */
export const ELITE_SHOT_GRADES: Record<string, NonNullable<Shot["grade"]>> = {
  "h01-road": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0.0, 0.0, 0.0029, 0.0115, 0.0234, 0.038, 0.0554, 0.0754, 0.0981, 0.1234, 0.1515, 0.1821, 0.2154, 0.2512, 0.2894, 0.3299, 0.3725, 0.417, 0.4632, 0.5107, 0.5593, 0.6087, 0.6584, 0.708, 0.757, 0.805, 0.8514, 0.8955, 0.9368, 0.9746, 1.0, 1.0, 1.0] },
  "h02-cobbles": { gamma: 1, contrast: 1, saturation: 1.499, warmth: 1.02,
    curve: [0.0, 0.0, 0.079, 0.1392, 0.1931, 0.2435, 0.2913, 0.3371, 0.3811, 0.4234, 0.4642, 0.5036, 0.5416, 0.5782, 0.6134, 0.6474, 0.68, 0.7114, 0.7414, 0.7702, 0.7977, 0.824, 0.849, 0.8727, 0.8952, 0.9164, 0.9364, 0.9551, 0.9726, 0.9888, 1.0, 1.0, 1.0] },
  "h03-street": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0.0, 0.0, 0.0, 0.0, 0.0018, 0.008, 0.0171, 0.0289, 0.0432, 0.06, 0.0796, 0.1018, 0.1268, 0.1546, 0.1852, 0.2186, 0.2548, 0.2936, 0.3351, 0.379, 0.4251, 0.4731, 0.5228, 0.5739, 0.6258, 0.6781, 0.7304, 0.7819, 0.8322, 0.8803, 0.9257, 0.9673, 1.0] },
  "h04-vanair": { gamma: 1, contrast: 1, saturation: 1.375, warmth: 1.02,
    curve: [0.0, 0.0, 0.0627, 0.1344, 0.194, 0.248, 0.2982, 0.3455, 0.3904, 0.4332, 0.4741, 0.5133, 0.5508, 0.5867, 0.6212, 0.6542, 0.6858, 0.7161, 0.745, 0.7727, 0.7991, 0.8242, 0.8481, 0.8708, 0.8923, 0.9125, 0.9317, 0.9496, 0.9664, 0.9821, 0.9966, 1.0, 1.0] },
  "h05-van": { gamma: 1, contrast: 1, saturation: 1.671, warmth: 1.02,
    curve: [0.0, 0.0, 0.0349, 0.0681, 0.1019, 0.1367, 0.1723, 0.2087, 0.2457, 0.2832, 0.321, 0.3591, 0.3973, 0.4355, 0.4736, 0.5113, 0.5488, 0.5857, 0.6221, 0.6578, 0.6927, 0.7267, 0.7597, 0.7917, 0.8224, 0.852, 0.8801, 0.9069, 0.9321, 0.9557, 0.9776, 0.9977, 1.0] },
  "h06-out": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0, 0.0247, 0.0607, 0.0971, 0.1343, 0.1724, 0.2112, 0.2506, 0.2905, 0.3308, 0.3711, 0.4116, 0.4518, 0.4919, 0.5315, 0.5707, 0.6092, 0.647, 0.6839, 0.7198, 0.7547, 0.7883, 0.8207, 0.8516, 0.8811, 0.909, 0.9351, 0.9595, 0.9821, 1.0, 1.0, 1.0] },
  "h07-ladderoff": { gamma: 1, contrast: 1, saturation: 1.428, warmth: 1.02,
    curve: [0.0, 0.0, 0.0115, 0.0369, 0.0647, 0.0949, 0.1271, 0.1612, 0.197, 0.2343, 0.2729, 0.3126, 0.3532, 0.3945, 0.4363, 0.4784, 0.5207, 0.5629, 0.6048, 0.6463, 0.6871, 0.727, 0.7659, 0.8035, 0.8396, 0.874, 0.9066, 0.9372, 0.9654, 0.9912, 1.0, 1.0, 1.0] },
  "h08-atvan": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0, 0.0076, 0.0505, 0.0897, 0.1285, 0.1673, 0.2062, 0.2452, 0.2842, 0.3231, 0.3619, 0.4004, 0.4385, 0.4763, 0.5135, 0.5502, 0.5861, 0.6213, 0.6558, 0.6893, 0.7218, 0.7534, 0.7839, 0.8132, 0.8413, 0.8682, 0.8937, 0.9179, 0.9407, 0.962, 0.9818, 1.0] },
  "h09-vanrear": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0, 0.0391, 0.1015, 0.1544, 0.2033, 0.2496, 0.294, 0.3368, 0.3781, 0.4181, 0.4567, 0.4942, 0.5304, 0.5655, 0.5994, 0.6322, 0.6638, 0.6943, 0.7236, 0.7518, 0.7789, 0.8049, 0.8297, 0.8533, 0.8759, 0.8973, 0.9176, 0.9367, 0.9547, 0.9715, 0.9872, 1.0] },
  "h10-carry": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.034, 0.1054, 0.1626, 0.2146, 0.2633, 0.3095, 0.3536, 0.3959, 0.4366, 0.4758, 0.5135, 0.5499, 0.5849, 0.6186, 0.6511, 0.6823, 0.7123, 0.741, 0.7686, 0.795, 0.8201, 0.8442, 0.867, 0.8887, 0.9092, 0.9286, 0.9469, 0.964, 0.98, 0.9948, 1.0, 1.0] },
  "h11-hero": { gamma: 1, contrast: 1, saturation: 1.239, warmth: 1.02,
    curve: [0.0, 0.0, 0.0127, 0.0749, 0.1284, 0.1798, 0.23, 0.2792, 0.3275, 0.3749, 0.4213, 0.4667, 0.511, 0.554, 0.5959, 0.6364, 0.6755, 0.7131, 0.7493, 0.7839, 0.8168, 0.8481, 0.8777, 0.9055, 0.9315, 0.9556, 0.9777, 0.998, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "h12-walkin": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.004, 0.0165, 0.0324, 0.0513, 0.0728, 0.0969, 0.1235, 0.1526, 0.184, 0.2176, 0.2534, 0.2911, 0.3306, 0.3717, 0.4143, 0.458, 0.5027, 0.5481, 0.5939, 0.6399, 0.6856, 0.7308, 0.7751, 0.8182, 0.8596, 0.8989, 0.9358, 0.9698, 1.0, 1.0, 1.0, 1.0] },
  "h13-room": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0087, 0.0326, 0.0583, 0.0856, 0.1145, 0.1448, 0.1765, 0.2092, 0.2431, 0.2778, 0.3132, 0.3493, 0.3858, 0.4227, 0.4599, 0.4971, 0.5342, 0.5712, 0.6079, 0.6442, 0.6799, 0.715, 0.7492, 0.7825, 0.8147, 0.8457, 0.8755, 0.9037, 0.9305, 0.9555, 0.9787, 1.0] },
  "h14-window": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.03, 0.0691, 0.1067, 0.1441, 0.1815, 0.219, 0.2565, 0.2939, 0.3312, 0.3683, 0.4051, 0.4415, 0.4776, 0.5131, 0.5481, 0.5825, 0.6162, 0.6492, 0.6813, 0.7126, 0.7429, 0.7723, 0.8007, 0.8279, 0.8541, 0.8791, 0.9029, 0.9254, 0.9466, 0.9665, 0.985, 1.0] },
  "h15-crouch": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.1546, 0.2439, 0.3119, 0.3693, 0.4197, 0.465, 0.5064, 0.5444, 0.5797, 0.6126, 0.6434, 0.6723, 0.6996, 0.7252, 0.7495, 0.7724, 0.7941, 0.8146, 0.8341, 0.8525, 0.8699, 0.8865, 0.9022, 0.917, 0.931, 0.9443, 0.9568, 0.9686, 0.9797, 0.9902, 1.0, 1.0] },
  "h16-glass": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.1381, 0.2242, 0.2914, 0.3491, 0.4004, 0.4469, 0.4897, 0.5293, 0.5662, 0.6008, 0.6333, 0.6639, 0.6928, 0.7201, 0.7459, 0.7704, 0.7936, 0.8155, 0.8363, 0.856, 0.8746, 0.8922, 0.9089, 0.9246, 0.9395, 0.9535, 0.9666, 0.979, 0.9906, 1.0, 1.0, 1.0] },
  "h17-window2": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0172, 0.0485, 0.0801, 0.1127, 0.1461, 0.1804, 0.2154, 0.251, 0.2871, 0.3235, 0.3602, 0.397, 0.4338, 0.4705, 0.5071, 0.5433, 0.5791, 0.6143, 0.649, 0.683, 0.7162, 0.7485, 0.7799, 0.8102, 0.8393, 0.8673, 0.8939, 0.9191, 0.9429, 0.9651, 0.9857, 1.0] },
  "h18-reflect": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0114, 0.0505, 0.0895, 0.1297, 0.1709, 0.2131, 0.2561, 0.2996, 0.3435, 0.3876, 0.4316, 0.4755, 0.519, 0.5619, 0.6042, 0.6456, 0.686, 0.7252, 0.7632, 0.7996, 0.8345, 0.8677, 0.899, 0.9283, 0.9555, 0.9805, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "h19-solar": { gamma: 1, contrast: 1, saturation: 1.453, warmth: 1.02,
    curve: [0.0, 0.0, 0.0219, 0.0784, 0.1276, 0.1744, 0.2199, 0.2643, 0.3078, 0.3504, 0.3921, 0.4329, 0.4728, 0.5117, 0.5496, 0.5865, 0.6223, 0.657, 0.6906, 0.723, 0.7542, 0.7841, 0.8128, 0.8403, 0.8664, 0.8911, 0.9145, 0.9365, 0.9571, 0.9762, 0.9939, 1.0, 1.0] },
  "h20-solarair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0.0, 0.0, 0.0, 0.0562, 0.1059, 0.1529, 0.1986, 0.2433, 0.2872, 0.3304, 0.3728, 0.4144, 0.4552, 0.495, 0.5339, 0.5718, 0.6087, 0.6445, 0.6792, 0.7127, 0.745, 0.7761, 0.8059, 0.8343, 0.8614, 0.8871, 0.9114, 0.9342, 0.9556, 0.9754, 0.9937, 1.0, 1.0] },
  "h21-hotel": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0.0, 0.0, 0.0, 0.0218, 0.0787, 0.1283, 0.1755, 0.2214, 0.2662, 0.31, 0.3529, 0.3949, 0.436, 0.4762, 0.5153, 0.5535, 0.5906, 0.6266, 0.6615, 0.6952, 0.7277, 0.759, 0.789, 0.8177, 0.8452, 0.8712, 0.8959, 0.9192, 0.9411, 0.9616, 0.9805, 0.998, 1.0] },
  "h22-rise": { gamma: 1, contrast: 1, saturation: 1.089, warmth: 1.02,
    curve: [0.0, 0.0, 0.0706, 0.1372, 0.1934, 0.2446, 0.2923, 0.3373, 0.3802, 0.421, 0.4602, 0.4977, 0.5337, 0.5683, 0.6015, 0.6335, 0.6641, 0.6935, 0.7218, 0.7488, 0.7747, 0.7995, 0.8231, 0.8457, 0.8672, 0.8876, 0.907, 0.9253, 0.9426, 0.9589, 0.9741, 0.9884, 1.0] },
  "h23-road2": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0.0, 0.0, 0.0056, 0.0189, 0.0355, 0.0549, 0.0769, 0.1014, 0.1283, 0.1575, 0.189, 0.2225, 0.2581, 0.2955, 0.3346, 0.3752, 0.4171, 0.4602, 0.5041, 0.5486, 0.5935, 0.6384, 0.6832, 0.7274, 0.7708, 0.813, 0.8537, 0.8924, 0.9288, 0.9625, 0.9931, 1.0, 1.0] },
  "h24-village": { gamma: 1, contrast: 1, saturation: 1.43, warmth: 1.02,
    curve: [0.0, 0.0, 0.0514, 0.1269, 0.1884, 0.2439, 0.2955, 0.3441, 0.3902, 0.4342, 0.4763, 0.5165, 0.555, 0.5919, 0.6272, 0.6611, 0.6935, 0.7244, 0.754, 0.7822, 0.809, 0.8345, 0.8587, 0.8817, 0.9033, 0.9237, 0.9429, 0.9608, 0.9774, 0.9929, 1.0, 1.0, 1.0] },
  "s01-arrive": { gamma: 1, contrast: 1, saturation: 1.627, warmth: 1.02,
    curve: [0.0, 0.0, 0.1408, 0.2416, 0.3179, 0.3822, 0.4388, 0.4897, 0.536, 0.5787, 0.6181, 0.6547, 0.6888, 0.7207, 0.7506, 0.7785, 0.8048, 0.8294, 0.8525, 0.8741, 0.8944, 0.9134, 0.9312, 0.9477, 0.9632, 0.9776, 0.9909, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "s02-out": { gamma: 1, contrast: 1, saturation: 1.736, warmth: 1.02,
    curve: [0.0, 0.0, 0.0216, 0.0547, 0.0889, 0.1244, 0.1611, 0.1989, 0.2376, 0.2771, 0.3172, 0.3576, 0.3983, 0.4391, 0.4798, 0.5203, 0.5604, 0.6, 0.639, 0.6771, 0.7144, 0.7505, 0.7855, 0.8192, 0.8514, 0.8821, 0.9111, 0.9383, 0.9635, 0.9868, 1.0, 1.0, 1.0] },
  "s03-ladder": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0, 0.082, 0.1492, 0.2071, 0.2601, 0.3097, 0.3566, 0.4013, 0.4438, 0.4846, 0.5236, 0.561, 0.5968, 0.6312, 0.6641, 0.6957, 0.7258, 0.7547, 0.7822, 0.8084, 0.8334, 0.8571, 0.8796, 0.9009, 0.921, 0.9398, 0.9575, 0.974, 0.9894, 1.0, 1.0, 1.0] },
  "s04-carry": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0298, 0.0885, 0.1431, 0.1966, 0.2494, 0.3015, 0.3529, 0.4034, 0.4529, 0.5014, 0.5486, 0.5945, 0.6389, 0.6817, 0.7229, 0.7623, 0.7998, 0.8354, 0.869, 0.9004, 0.9296, 0.9566, 0.9811, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "s05-walkin": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.0068, 0.0216, 0.0408, 0.0641, 0.0912, 0.122, 0.1565, 0.1947, 0.2362, 0.281, 0.3287, 0.3791, 0.4318, 0.4864, 0.5424, 0.5993, 0.6565, 0.7134, 0.7693, 0.8235, 0.8751, 0.9232, 0.9671, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "s06-work": { gamma: 1, contrast: 1, saturation: 1.8, warmth: 1.02,
    curve: [0.0, 0.1908, 0.2884, 0.3639, 0.4277, 0.4836, 0.5336, 0.579, 0.6204, 0.6586, 0.6939, 0.7266, 0.7571, 0.7854, 0.8119, 0.8366, 0.8596, 0.8812, 0.9013, 0.92, 0.9375, 0.9537, 0.9688, 0.9828, 0.9958, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "s07-grin": { gamma: 1, contrast: 1, saturation: 1.789, warmth: 1.02,
    curve: [0.0, 0.0072, 0.0262, 0.0486, 0.0739, 0.102, 0.1326, 0.1656, 0.2008, 0.238, 0.277, 0.3177, 0.3597, 0.4029, 0.4471, 0.492, 0.5373, 0.5828, 0.6282, 0.6733, 0.7176, 0.761, 0.8031, 0.8436, 0.8821, 0.9184, 0.9521, 0.9829, 1.0, 1.0, 1.0, 1.0, 1.0] },
  "s08-rise": { gamma: 1, contrast: 1, saturation: 1.459, warmth: 1.02,
    curve: [0.0, 0.0, 0.0123, 0.0726, 0.1246, 0.1746, 0.2235, 0.2715, 0.3187, 0.365, 0.4105, 0.455, 0.4985, 0.5409, 0.5821, 0.6221, 0.6608, 0.6982, 0.7342, 0.7687, 0.8017, 0.8331, 0.8629, 0.891, 0.9174, 0.942, 0.9648, 0.9858, 1.0, 1.0, 1.0, 1.0, 1.0] },
};
// </elite-grades>

/** Per-shot grade where one was solved, the shot's preset otherwise. */
const graded = (shots: Shot[]): Shot[] =>
  shots.map((s) => ({ ...s, grade: ELITE_SHOT_GRADES[s.id] ?? s.grade }));

/** Website header: the arrival and the work, fast, looping. */
export const SHOTS_ELITE_HEADER: Shot[] = graded(inProject("elite", [
  { id: "h01-road",      ...S.road,      kind: "video", durationInFrames: 22 },
  { id: "h02-cobbles",   ...S.cobbles,   kind: "video", durationInFrames: 18 },
  { id: "h03-street",    ...S.street,    kind: "video", durationInFrames: 16, move: "push" },
  { id: "h04-vanair",    ...S.vanAir,    kind: "video", durationInFrames: 40 },
  { id: "h05-van",       ...S.van,       kind: "video", durationInFrames: 16, move: "push" },
  { id: "h06-out",       ...S.out,       kind: "video", durationInFrames: 28, move: "pull" },
  { id: "h07-ladderoff", ...S.ladderOff, kind: "video", durationInFrames: 20, move: "push" },
  { id: "h08-atvan",     ...S.atVan,     kind: "video", durationInFrames: 16, move: "pull" },
  { id: "h09-vanrear",   ...S.vanRear,   kind: "video", durationInFrames: 18, move: "push" },
  { id: "h10-carry",     ...S.carry,     kind: "video", durationInFrames: 26, move: "pull" },
  { id: "h11-hero",      ...S.hero,      kind: "video", durationInFrames: 24 },
  { id: "h12-walkin",    ...S.walkIn,    kind: "video", durationInFrames: 20, move: "push" },
  { id: "h13-room",      ...S.room,      kind: "video", durationInFrames: 16, move: "pull" },
  { id: "h14-window",    ...S.window,    kind: "video", durationInFrames: 16, move: "push" },
  { id: "h15-crouch",    ...S.crouch,    kind: "video", durationInFrames: 24, move: "pull" },
  { id: "h16-glass",     ...S.glass,     kind: "video", durationInFrames: 18, move: "push" },
  { id: "h17-window2",   ...S.window2,   kind: "video", durationInFrames: 16, move: "pull" },
  { id: "h18-reflect",   ...S.reflect,   kind: "video", durationInFrames: 32, move: "push" },
  { id: "h19-solar",     ...S.solar,     kind: "video", durationInFrames: 18 },
  { id: "h20-solarair",  ...S.solarAir,  kind: "video", durationInFrames: 18 },
  { id: "h21-hotel",     ...S.hotel,     kind: "video", durationInFrames: 18 },
  { id: "h22-rise",      ...S.rise,      kind: "video", durationInFrames: 20 },
  { id: "h23-road2",     ...S.road2,     kind: "video", durationInFrames: 16 },
  { id: "h24-village",   ...S.village,   kind: "video", durationInFrames: 24 },
]));

/**
 * Advert: a story in eight beats, 18 seconds, for a voiceover to sit on.
 * Michael's brief after the fast cut: too long, too many shots, Tino not
 * always visible, the frame moving left and right. So: one beat per
 * sentence, 1.8-2.6s each, Tino in the middle of every shot after the van
 * arrives, no pans, and every shot moving the same way (a slow push in),
 * no punch-in on the cut.
 *
 *   0.0  the van drives in, from the air      Ik ben Tino van Elite Cleaning.
 *   2.5  Tino steps out                       Ramen, zonnepanelen, dak en gevel:
 *   4.9  the ladder comes off the roof        wij maken het weer proper.
 *   6.9  he walks in with the ladder          Van de ladder tot het laatste
 *   8.9  through the door with his bucket     streepje glas,
 *  10.7  crouched at the window               ik doe het zelf,
 *  12.9  grinning at the glass                en ik doe het grondig.
 *  15.5  the drone rises off him              Honderden klanten gingen je voor.
 *  18.0  logo                                 Vraag je gratis offerte.
 */
export const SHOTS_ELITE_AD: Shot[] = graded(inProject("elite", [
  // The van stays inside a fixed slice at 18% for the whole beat, so the
  // frame does not have to chase it.
  { id: "s01-arrive", ...S.vanAir,    speed: 1.2, kind: "video", durationInFrames: 62, focus: "18% 50%", move: "push", punch: false },
  { id: "s02-out",    ...S.out,                   kind: "video", durationInFrames: 60, focus: "38% 50%", move: "push", punch: false },
  { id: "s03-ladder", ...S.ladderOff,             kind: "video", durationInFrames: 50, focus: "4% 50%",  move: "push", punch: false },
  { id: "s04-carry",  ...S.carry,                 kind: "video", durationInFrames: 50, focus: "55% 50%", move: "push", punch: false },
  { id: "s05-walkin", ...S.walkIn,                kind: "video", durationInFrames: 45, focus: "78% 50%", move: "push", punch: false },
  { id: "s06-work",   ...S.crouch,                kind: "video", durationInFrames: 55, focus: "80% 50%", move: "push", punch: false },
  { id: "s07-grin",   ...S.reflect,               kind: "video", durationInFrames: 66, focus: "91% 50%", move: "push", punch: false },
  { id: "s08-rise",   ...S.hero,      speed: 1.2, kind: "video", durationInFrames: 62, focus: "45% 50%", move: "push", punch: false },
]));


FILMS["elite-header-wide"] = {
  id: "elite-header-wide",
  label: "Elite Cleaning - website header (16:9)",
  format: "wide",
  shots: SHOTS_ELITE_HEADER,
  energy: "fast",
  captions: {},
  endCard: null,
  plain: true,
  loopFade: 8,
  targetFrames: HEADER_FRAMES,
};

FILMS["elite-ad"] = {
  id: "elite-ad",
  label: "Elite Cleaning - advert (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_AD,
  // 6-frame dissolves: soft enough under a voice, still a cut.
  energy: "high",
  captions: {},
  // No vignette or bottom scrim: they exist to keep captions legible, this
  // cut has none yet, and they were taking back a third of the brightness
  // the grade put in (median luma 132 graded, 98 on screen).
  plain: true,
  // Light card: the logo is black and dark grey on light-blue bubbles and
  // disappears on navy, and it may not be altered - so the card goes light
  // rather than the logo going white.
  endCard: {
    durationInFrames: 45,
    wordmark: "ELITE CLEANING",
    line: "Specialist in reiniging",
    venue: "Geraardsbergen en omstreken",
    cta: "elitecleaning.be",
    logo: "images/elite-cleaning-logo.png",
    logoBlend: "normal",
    accent: ELITE.blue,
    background: ELITE.skyLight,
    ink: ELITE.navy,
    fontFamily: ELITE_FONT,
  },
  // 18s of story + 1.8s of logo.
  targetFrames: 18 * FPS + 45,
};
