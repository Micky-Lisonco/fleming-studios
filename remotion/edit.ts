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
  grade?: { gamma: number; contrast: number; saturation: number; warmth: number };
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
  "h01-road": { gamma: 0.811, contrast: 1.1, saturation: 1.515, warmth: 1.02 },
  "h02-cobbles": { gamma: 0.508, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h03-street": { gamma: 1.17, contrast: 1.1, saturation: 0.939, warmth: 1.02 },
  "h04-vanair": { gamma: 0.555, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h05-van": { gamma: 0.488, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h06-out": { gamma: 0.635, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h07-ladderoff": { gamma: 0.662, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h08-atvan": { gamma: 0.671, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h09-vanrear": { gamma: 0.546, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h10-carry": { gamma: 0.488, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h11-hero": { gamma: 0.616, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h12-walkin": { gamma: 0.852, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h13-room": { gamma: 0.861, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h14-window": { gamma: 0.71, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h15-crouch": { gamma: 0.373, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h16-glass": { gamma: 0.411, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h17-window2": { gamma: 0.772, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h18-reflect": { gamma: 0.571, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h19-solar": { gamma: 0.659, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "h20-solarair": { gamma: 0.687, contrast: 1.1, saturation: 1.568, warmth: 1.02 },
  "h21-hotel": { gamma: 0.714, contrast: 1.1, saturation: 1.59, warmth: 1.02 },
  "h22-rise": { gamma: 0.573, contrast: 1.1, saturation: 1.772, warmth: 1.02 },
  "h23-road2": { gamma: 0.851, contrast: 1.1, saturation: 1.659, warmth: 1.02 },
  "h24-village": { gamma: 0.554, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v01-road": { gamma: 1.394, contrast: 1.1, saturation: 1.855, warmth: 1.02 },
  "v02-cobbles": { gamma: 0.887, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v03-sign": { gamma: 0.776, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v04-vanair": { gamma: 0.447, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v05-van": { gamma: 0.372, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v06-out": { gamma: 0.571, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v07-ladderoff": { gamma: 0.543, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v08-atvan": { gamma: 0.935, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v09-vanrear": { gamma: 0.522, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v10-carry": { gamma: 0.437, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v11-hotel": { gamma: 0.706, contrast: 1.1, saturation: 1.449, warmth: 1.02 },
  "v12-leaves": { gamma: 0.869, contrast: 1.1, saturation: 1.34, warmth: 1.02 },
  "v13-hero": { gamma: 0.631, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v14-walkin": { gamma: 0.708, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v15-room": { gamma: 0.571, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v16-window": { gamma: 0.553, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v17-crouch": { gamma: 0.36, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v18-glass": { gamma: 0.441, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v19-window2": { gamma: 0.522, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v20-chamber": { gamma: 0.617, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v21-reflect": { gamma: 0.631, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v22-glass2": { gamma: 0.389, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v23-solar": { gamma: 0.702, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v24-solarair": { gamma: 0.755, contrast: 1.1, saturation: 1.635, warmth: 1.02 },
  "v25-church": { gamma: 0.586, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v26-churchair": { gamma: 0.443, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v27-rise": { gamma: 0.5, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
  "v28-street": { gamma: 1.577, contrast: 1.1, saturation: 1.243, warmth: 1.02 },
  "v29-village": { gamma: 0.571, contrast: 1.1, saturation: 2.2, warmth: 1.02 },
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
 * Advert: the same story re-framed for 9:16 (focus = where the subject is
 * in the 16:9 frame), plus the job site in flashes - the hotel, the church,
 * the oxygen chamber - which is where he works, not what the ad is about.
 * Tino's voice goes over it later.
 */
export const SHOTS_ELITE_AD: Shot[] = graded([
  ...inProject("elite", [
    { id: "v01-road",      ...S.road,      kind: "video", durationInFrames: 20, focus: "50% 50%" },
    { id: "v02-cobbles",   ...S.cobbles,   kind: "video", durationInFrames: 18, focus: "45% 50%" },
    { id: "v03-sign",      ...S.sign,      kind: "video", durationInFrames: 16, focus: "45% 50%" },
    // The van drives along the front of the hotel, so the frame follows it.
    { id: "v04-vanair",    ...S.vanAir,    kind: "video", durationInFrames: 42, pan: [6, 20] },
    { id: "v05-van",       ...S.van,       kind: "video", durationInFrames: 16, focus: "80% 50%", move: "push" },
    { id: "v06-out",       ...S.out,       kind: "video", durationInFrames: 30, focus: "38% 50%", move: "pull" },
    { id: "v07-ladderoff", ...S.ladderOff, kind: "video", durationInFrames: 20, focus: "4% 50%", move: "push" },
    { id: "v08-atvan",     ...S.atVan,     kind: "video", durationInFrames: 16, focus: "25% 50%", move: "pull" },
    { id: "v09-vanrear",   ...S.vanRear,   kind: "video", durationInFrames: 18, focus: "45% 50%", move: "push" },
    { id: "v10-carry",     ...S.carry,     kind: "video", durationInFrames: 24, focus: "55% 50%", move: "pull" },
    { id: "v11-hotel",     ...S.hotel,     kind: "video", durationInFrames: 16, focus: "50% 50%" },
    { id: "v12-leaves",    ...S.leaves,    kind: "video", durationInFrames: 18, focus: "45% 50%", move: "push" },
    { id: "v13-hero",      ...S.hero,      kind: "video", durationInFrames: 24, focus: "45% 50%" },
    { id: "v14-walkin",    ...S.walkIn,    kind: "video", durationInFrames: 20, focus: "78% 50%", move: "push" },
    { id: "v15-room",      ...S.room,      kind: "video", durationInFrames: 16, focus: "72% 50%", move: "pull" },
    { id: "v16-window",    ...S.window,    kind: "video", durationInFrames: 16, focus: "68% 50%", move: "push" },
    { id: "v17-crouch",    ...S.crouch,    kind: "video", durationInFrames: 22, focus: "80% 50%", move: "pull" },
    { id: "v18-glass",     ...S.glass,     kind: "video", durationInFrames: 18, focus: "40% 50%", move: "push" },
    { id: "v19-window2",   ...S.window2,   kind: "video", durationInFrames: 16, focus: "52% 50%", move: "pull" },
  ]),
  // A flash of the oxygen chamber - Normocare footage, so no project.
  { id: "v20-chamber", file: "24-DJI_20260905124227_0023_D.mp4", startFrom: 60, kind: "video", durationInFrames: 16, focus: "23% 50%", grade: ELITE_GRADE.drone },
  ...inProject("elite", [
    { id: "v21-reflect",   ...S.reflect,   kind: "video", durationInFrames: 32, focus: "91% 50%", move: "push" },
    { id: "v22-glass2",    ...S.glass2,    kind: "video", durationInFrames: 16, focus: "70% 50%", move: "pull" },
    { id: "v23-solar",     ...S.solar,     kind: "video", durationInFrames: 18, focus: "40% 50%" },
    { id: "v24-solarair",  ...S.solarAir,  kind: "video", durationInFrames: 18, focus: "50% 50%" },
    { id: "v25-church",    ...S.church,    kind: "video", durationInFrames: 16, focus: "55% 50%" },
    { id: "v26-churchair", ...S.churchAir, kind: "video", durationInFrames: 16, focus: "50% 50%" },
    { id: "v27-rise",      ...S.rise,      kind: "video", durationInFrames: 20, focus: "50% 50%" },
    { id: "v28-street",    ...S.street,    kind: "video", durationInFrames: 16, focus: "30% 50%", move: "push" },
    { id: "v29-village",   ...S.village,   kind: "video", durationInFrames: 26, focus: "50% 50%" },
  ]),
]);

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
  energy: "fast",
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
  targetFrames: 25 * FPS,
};
