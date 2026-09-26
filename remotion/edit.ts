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
    curve: [0, 0.0263, 0.0527, 0.08, 0.1086, 0.1381, 0.1679, 0.1974, 0.226, 0.2531, 0.279, 0.3041, 0.3289, 0.3537, 0.3791, 0.4056, 0.4335, 0.4634, 0.4958, 0.5328, 0.5745, 0.6186, 0.6628, 0.705, 0.7453, 0.7855, 0.8239, 0.8589, 0.89, 0.9185, 0.9457, 0.9725, 1] },
  "h02-cobbles": { gamma: 1, contrast: 1, saturation: 1.247, warmth: 1.02,
    curve: [0, 0.0315, 0.0709, 0.1333, 0.183, 0.2232, 0.2593, 0.2923, 0.3233, 0.3534, 0.3836, 0.4132, 0.4413, 0.4683, 0.4944, 0.5201, 0.5456, 0.5712, 0.5973, 0.6243, 0.6524, 0.682, 0.7143, 0.7485, 0.783, 0.8163, 0.8466, 0.8743, 0.9005, 0.9256, 0.9502, 0.9748, 1] },
  "h03-street": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0197, 0.0389, 0.0582, 0.0781, 0.0993, 0.1223, 0.1478, 0.1752, 0.2038, 0.2329, 0.2618, 0.2899, 0.3177, 0.3453, 0.3731, 0.4011, 0.4295, 0.4586, 0.4884, 0.5193, 0.551, 0.5833, 0.6164, 0.6506, 0.6862, 0.7234, 0.7625, 0.8049, 0.851, 0.8988, 0.9487, 1] },
  "h04-vanair": { gamma: 1, contrast: 1, saturation: 1.046, warmth: 1.02,
    curve: [0, 0.0234, 0.047, 0.0779, 0.1322, 0.1881, 0.2333, 0.2753, 0.3145, 0.3514, 0.3865, 0.4197, 0.4513, 0.4815, 0.5107, 0.5391, 0.5671, 0.5951, 0.6232, 0.6519, 0.681, 0.7101, 0.7391, 0.7678, 0.796, 0.8235, 0.8502, 0.876, 0.9012, 0.926, 0.9505, 0.9751, 1] },
  "h05-van": { gamma: 1, contrast: 1, saturation: 1.396, warmth: 1.02,
    curve: [0, 0.0306, 0.0733, 0.1493, 0.1907, 0.224, 0.2516, 0.275, 0.2957, 0.3152, 0.3349, 0.3564, 0.3811, 0.4105, 0.447, 0.4988, 0.5578, 0.6109, 0.6487, 0.6803, 0.7084, 0.7339, 0.7577, 0.7807, 0.8038, 0.8279, 0.8531, 0.8779, 0.9025, 0.9269, 0.9512, 0.9755, 1] },
  "h06-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0251, 0.0505, 0.0818, 0.1256, 0.1721, 0.2099, 0.244, 0.276, 0.3063, 0.3355, 0.3641, 0.3927, 0.4217, 0.4507, 0.4786, 0.5057, 0.5323, 0.5589, 0.5859, 0.6137, 0.6426, 0.6731, 0.7056, 0.7425, 0.7841, 0.8253, 0.8612, 0.8919, 0.92, 0.9466, 0.9729, 1] },
  "h07-ladderoff": { gamma: 1, contrast: 1, saturation: 1.321, warmth: 1.02,
    curve: [0, 0.0241, 0.0482, 0.0765, 0.1159, 0.1619, 0.2013, 0.2344, 0.2649, 0.2934, 0.3206, 0.3472, 0.3737, 0.401, 0.4296, 0.4599, 0.4908, 0.522, 0.5538, 0.5862, 0.6193, 0.6535, 0.6887, 0.7266, 0.7683, 0.8092, 0.8449, 0.8747, 0.9017, 0.9267, 0.9508, 0.9749, 1] },
  "h08-atvan": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0237, 0.0473, 0.0744, 0.1107, 0.1547, 0.196, 0.2309, 0.2635, 0.2944, 0.3244, 0.3539, 0.3838, 0.4145, 0.4468, 0.4802, 0.5144, 0.5489, 0.5833, 0.6173, 0.6503, 0.6821, 0.7129, 0.7429, 0.7723, 0.8013, 0.8299, 0.8582, 0.8864, 0.9146, 0.9428, 0.9713, 1] },
  "h09-vanrear": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0248, 0.0515, 0.0984, 0.1679, 0.2107, 0.2468, 0.2781, 0.3065, 0.3338, 0.3621, 0.393, 0.4277, 0.4647, 0.5028, 0.5405, 0.5767, 0.6101, 0.6395, 0.665, 0.6876, 0.708, 0.727, 0.7451, 0.7631, 0.7816, 0.8013, 0.8229, 0.847, 0.8743, 0.9062, 0.9511, 1] },
  "h10-carry": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0376, 0.0888, 0.1497, 0.1922, 0.2276, 0.2589, 0.2884, 0.3186, 0.3522, 0.3919, 0.4423, 0.4968, 0.5469, 0.5841, 0.6132, 0.639, 0.6622, 0.6832, 0.7025, 0.7205, 0.7378, 0.7548, 0.7719, 0.7898, 0.8087, 0.8293, 0.852, 0.8774, 0.9061, 0.9371, 0.9689, 1] },
  "h11-hero": { gamma: 1, contrast: 1, saturation: 1.046, warmth: 1.02,
    curve: [0, 0.0233, 0.0462, 0.0725, 0.1069, 0.15, 0.1942, 0.2355, 0.2767, 0.3178, 0.3584, 0.3984, 0.4384, 0.4787, 0.5184, 0.5569, 0.5936, 0.6277, 0.6601, 0.6912, 0.721, 0.7495, 0.7767, 0.8027, 0.8272, 0.8506, 0.8729, 0.8945, 0.9156, 0.9364, 0.9573, 0.9784, 1] },
  "h12-walkin": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0247, 0.0494, 0.075, 0.1021, 0.1302, 0.1591, 0.1885, 0.2182, 0.2479, 0.2771, 0.3063, 0.3358, 0.366, 0.3973, 0.4303, 0.4652, 0.5043, 0.5481, 0.5936, 0.6377, 0.6774, 0.7121, 0.7445, 0.7751, 0.8046, 0.8336, 0.8625, 0.8909, 0.9184, 0.9456, 0.9727, 1] },
  "h13-room": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0346, 0.0664, 0.0939, 0.119, 0.1429, 0.1665, 0.1909, 0.2171, 0.246, 0.2774, 0.3106, 0.345, 0.3803, 0.4159, 0.4513, 0.487, 0.5239, 0.5612, 0.5985, 0.635, 0.6702, 0.7035, 0.7356, 0.7668, 0.7972, 0.8271, 0.8569, 0.8862, 0.9149, 0.9433, 0.9716, 1] },
  "h14-window": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0401, 0.0736, 0.1018, 0.1272, 0.1523, 0.1791, 0.2101, 0.2479, 0.2919, 0.3389, 0.3856, 0.4286, 0.4652, 0.4984, 0.5294, 0.5588, 0.5874, 0.6156, 0.6443, 0.6737, 0.7032, 0.7327, 0.7619, 0.7907, 0.8189, 0.8464, 0.873, 0.8988, 0.9242, 0.9494, 0.9746, 1] },
  "h15-crouch": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0832, 0.1399, 0.207, 0.2759, 0.3327, 0.3692, 0.4001, 0.4279, 0.4529, 0.4756, 0.4961, 0.515, 0.5326, 0.5493, 0.5654, 0.5812, 0.5973, 0.6138, 0.6312, 0.6499, 0.6702, 0.6925, 0.7158, 0.7389, 0.7624, 0.7869, 0.8129, 0.8411, 0.872, 0.9067, 0.9519, 1] },
  "h16-glass": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.061, 0.1281, 0.1874, 0.2447, 0.297, 0.3408, 0.3743, 0.4036, 0.4298, 0.4535, 0.4751, 0.4949, 0.5135, 0.5312, 0.5487, 0.5661, 0.5841, 0.6031, 0.6235, 0.6457, 0.6702, 0.6976, 0.7304, 0.7668, 0.8038, 0.8384, 0.8685, 0.8963, 0.9226, 0.9483, 0.9738, 1] },
  "h17-window2": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.038, 0.0711, 0.0997, 0.1259, 0.1511, 0.1767, 0.2043, 0.2349, 0.2679, 0.3026, 0.3382, 0.3743, 0.4101, 0.4451, 0.4805, 0.5163, 0.5521, 0.5874, 0.6218, 0.6549, 0.6863, 0.716, 0.7445, 0.7722, 0.7996, 0.8271, 0.8552, 0.8839, 0.9128, 0.9419, 0.971, 1] },
  "h18-reflect": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0345, 0.0721, 0.1155, 0.1587, 0.1958, 0.2291, 0.2602, 0.29, 0.3196, 0.3501, 0.3824, 0.4178, 0.4576, 0.5001, 0.5431, 0.5844, 0.6216, 0.6549, 0.6864, 0.7163, 0.7448, 0.7721, 0.7983, 0.8235, 0.8475, 0.8704, 0.8925, 0.914, 0.9353, 0.9566, 0.978, 1] },
  "h19-solar": { gamma: 1, contrast: 1, saturation: 1.135, warmth: 1.02,
    curve: [0, 0.0217, 0.0426, 0.0667, 0.0994, 0.1501, 0.1994, 0.2402, 0.2785, 0.3148, 0.3496, 0.3834, 0.4166, 0.4489, 0.4803, 0.5109, 0.5409, 0.5704, 0.5994, 0.6282, 0.6568, 0.6852, 0.7129, 0.7398, 0.7665, 0.7931, 0.8201, 0.8478, 0.8766, 0.9067, 0.9377, 0.969, 1] },
  "h20-solarair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0215, 0.042, 0.0647, 0.0927, 0.1336, 0.181, 0.2229, 0.2618, 0.2993, 0.3358, 0.3715, 0.4067, 0.4415, 0.476, 0.5099, 0.5433, 0.5761, 0.6082, 0.6395, 0.67, 0.6994, 0.728, 0.756, 0.7835, 0.8108, 0.8381, 0.8655, 0.8926, 0.9195, 0.9463, 0.9731, 1] },
  "h21-hotel": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0207, 0.0406, 0.0613, 0.0845, 0.1122, 0.1464, 0.1846, 0.2239, 0.2644, 0.3076, 0.3513, 0.3934, 0.4319, 0.468, 0.5025, 0.5358, 0.5684, 0.6008, 0.6332, 0.6661, 0.7001, 0.7346, 0.7686, 0.801, 0.8308, 0.8578, 0.8831, 0.9071, 0.9303, 0.9532, 0.9763, 1] },
  "h22-rise": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0256, 0.0518, 0.0851, 0.1306, 0.1782, 0.2209, 0.2628, 0.3036, 0.3432, 0.3813, 0.418, 0.4538, 0.4887, 0.5227, 0.5558, 0.5882, 0.6197, 0.6506, 0.6808, 0.7104, 0.7392, 0.767, 0.7938, 0.8195, 0.8439, 0.8674, 0.89, 0.9121, 0.9339, 0.9557, 0.9776, 1] },
  "h23-road2": { gamma: 1, contrast: 1, saturation: 1.032, warmth: 1.02,
    curve: [0, 0.0242, 0.0484, 0.0735, 0.1005, 0.129, 0.1586, 0.1886, 0.2184, 0.2475, 0.2756, 0.3033, 0.3309, 0.3587, 0.3873, 0.4171, 0.4485, 0.4818, 0.5188, 0.5594, 0.6017, 0.6441, 0.6849, 0.7234, 0.7615, 0.7985, 0.8334, 0.8651, 0.8941, 0.9212, 0.9474, 0.9734, 1] },
  "h24-village": { gamma: 1, contrast: 1, saturation: 1.13, warmth: 1.02,
    curve: [0, 0.025, 0.0519, 0.096, 0.163, 0.2102, 0.2518, 0.2894, 0.3239, 0.3564, 0.388, 0.4177, 0.4455, 0.4719, 0.4972, 0.5217, 0.5458, 0.57, 0.5945, 0.6198, 0.6463, 0.6742, 0.7043, 0.7369, 0.7707, 0.8044, 0.8367, 0.8663, 0.8942, 0.921, 0.9473, 0.9734, 1] },
  "s01-arrive": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0244, 0.05, 0.0887, 0.1538, 0.228, 0.3067, 0.3627, 0.4094, 0.4506, 0.4873, 0.5207, 0.5519, 0.5813, 0.6086, 0.6342, 0.6583, 0.6814, 0.7037, 0.7255, 0.7471, 0.7689, 0.7911, 0.813, 0.8345, 0.8556, 0.8765, 0.8971, 0.9176, 0.9381, 0.9586, 0.9792, 1] },
  "s02-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0285, 0.0597, 0.105, 0.1572, 0.196, 0.2294, 0.2596, 0.2875, 0.3137, 0.3389, 0.364, 0.3896, 0.4165, 0.4451, 0.474, 0.5029, 0.5319, 0.5611, 0.5907, 0.6208, 0.6514, 0.6828, 0.7151, 0.7496, 0.7853, 0.8207, 0.8544, 0.8854, 0.9148, 0.9433, 0.9714, 1] },
  "s03-ladder": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0307, 0.0658, 0.1163, 0.1679, 0.2111, 0.2521, 0.2908, 0.327, 0.3608, 0.392, 0.4207, 0.4475, 0.4726, 0.4966, 0.5199, 0.5429, 0.566, 0.5896, 0.6142, 0.6402, 0.6681, 0.6984, 0.7334, 0.7713, 0.8088, 0.8427, 0.8721, 0.8992, 0.9248, 0.9496, 0.9745, 1] },
  "s04-carry": { gamma: 1, contrast: 1, saturation: 1.409, warmth: 1.02,
    curve: [0, 0.0436, 0.114, 0.1703, 0.2101, 0.243, 0.272, 0.3, 0.3298, 0.3642, 0.4054, 0.4515, 0.4995, 0.5465, 0.59, 0.6333, 0.6749, 0.7109, 0.739, 0.7642, 0.7873, 0.8088, 0.8287, 0.8475, 0.8652, 0.8822, 0.8986, 0.9148, 0.931, 0.9473, 0.9641, 0.9816, 1] },
  "s05-walkin": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0616, 0.102, 0.1354, 0.1681, 0.2016, 0.2331, 0.2636, 0.2939, 0.3249, 0.3575, 0.3924, 0.428, 0.4621, 0.4993, 0.5445, 0.6023, 0.7118, 0.7528, 0.7858, 0.8141, 0.8383, 0.859, 0.8767, 0.8921, 0.9057, 0.918, 0.9298, 0.9416, 0.9539, 0.9673, 0.9825, 1] },
  "s06-work": { gamma: 1, contrast: 1, saturation: 1.402, warmth: 1.02,
    curve: [0, 0.083, 0.1659, 0.2508, 0.3291, 0.3978, 0.4566, 0.4955, 0.5277, 0.5561, 0.5813, 0.6039, 0.6246, 0.6442, 0.6632, 0.6825, 0.7025, 0.7234, 0.7436, 0.7634, 0.7827, 0.8016, 0.8201, 0.8384, 0.8564, 0.8743, 0.8921, 0.9099, 0.9276, 0.9455, 0.9634, 0.9816, 1] },
  "s07-grin": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0422, 0.0792, 0.113, 0.1449, 0.1758, 0.2064, 0.2359, 0.2644, 0.2923, 0.32, 0.3476, 0.3755, 0.4041, 0.4335, 0.4638, 0.4943, 0.525, 0.5562, 0.5883, 0.6213, 0.6556, 0.6913, 0.7315, 0.7757, 0.8176, 0.8513, 0.8799, 0.9056, 0.9295, 0.9525, 0.9757, 1] },
  "s08-rise": { gamma: 1, contrast: 1, saturation: 1.103, warmth: 1.02,
    curve: [0, 0.0236, 0.0469, 0.0737, 0.109, 0.1524, 0.1959, 0.2358, 0.2744, 0.3134, 0.3539, 0.3975, 0.4486, 0.5046, 0.5578, 0.6005, 0.6361, 0.6684, 0.6979, 0.7252, 0.751, 0.7759, 0.7996, 0.822, 0.8434, 0.8639, 0.8837, 0.9031, 0.9221, 0.9412, 0.9604, 0.9799, 1] },
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
 *   4.9  the ladder comes off the roof        ik maak alles weer proper.
 *   6.9  he walks in with the ladder          Van de ladder tot het laatste
 *   8.9  through the door with his bucket     streepje glas,
 *  10.7  crouched at the window               ik doe het zelf,
 *  12.9  grinning at the glass                en ik doe het grondig.
 *  15.5  the drone rises off him              Honderden klanten gingen je voor.
 *  18.0  logo                                 Vraag vandaag je gratis offerte.
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
