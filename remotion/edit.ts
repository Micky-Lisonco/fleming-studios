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
  if (shot.generated) return `${shot.project ? `${shot.project}/` : ""}generated/${shot.file}`;
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
  shot.kind === "image" ? 0 : CONFORMED && !shot.generated ? 0 : (shot.startFrom ?? 0);

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
 * One line of speech. On a shot, frames are relative to the START OF THE
 * SHOT; on a film (Film.subtitles), they are timeline frames.
 */
export type Subtitle = { from: number; to: number; text: string };

/**
 * A piece of interview sound laid on the timeline on its own, independent
 * of the picture. This is what lets a sentence carry on over a cutaway:
 * the voice runs from the master's own audio while the picture cuts to
 * the van, or to Tino at the glass, and back.
 *
 * Over a shot of the same clip, keep the two in sync by hand: the voice
 * starts at timeline frame `from` with source frame `startFrom`, so the
 * shot under it should open on startFrom - (from - shot start).
 */
export type VoiceClip = {
  /** Unique across films: the conformed file is <id>.m4a. */
  id: string;
  /** Same filename as a shot: the proxy, which carries the audio too. */
  file: string;
  project?: string;
  /** Timeline frame the voice starts on. */
  from: number;
  /** Frames into the source, at 25 fps (seconds x 25). */
  startFrom: number;
  durationInFrames: number;
  /**
   * Integrated loudness of this stretch of the source, measured from
   * out/<project>/audio. Levels the Studio preview and the draft render;
   * conform measures the master itself for the delivery.
   */
  lufs: number;
  /** Sound of a generated cutaway: plays from public/<project>/generated. */
  generated?: boolean;
};

/** Loudness the voice is delivered at: what Meta and TikTok play at. */
export const VOICE_LUFS = -14;

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
  /**
   * A finished clip made for the edit (a Higgsfield cutaway), kept in git
   * at public/<project>/generated/<file>. There is no master to conform
   * it from, so it plays from that file, trimmed by startFrom, in every
   * mode, and it carries no sound.
   */
  generated?: boolean;
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
  /**
   * Hold the frame this much closer for the whole shot (1.4 = 40% in),
   * centred on zoomOrigin (CSS transform-origin, default the middle). A
   * comic snap-zoom is two shots of the same take, the second zoomed.
   */
  zoom?: number;
  zoomOrigin?: string;
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
  /**
   * Sound on its own track, independent of the cuts. The shots under it
   * stay muted, so a sentence can run across a cutaway.
   */
  voice?: VoiceClip[];
  /** Burned-in subtitles in timeline frames, for the voice track. */
  subtitles?: Subtitle[];
  /**
   * Lines of type that run across several cuts, in timeline frames: the
   * on-screen copy of a silent advert. A per-shot caption would animate
   * in again at every cut. Each carries its own soft backing, so the
   * footage does not have to be darkened for it.
   */
  titles?: Array<{
    from: number;
    to: number;
    text: string;
    sub?: string;
    /** Sit above the subtitles, for a line held while someone speaks. */
    aboveSubtitles?: boolean;
  }>;
  /** Loud text effects on top of everything, see components/Pop.tsx. */
  pops?: PopText[];
  /** Typeface for the titles and subtitles. Unset: system sans. */
  font?: string;
};

export type PopText = {
  /** Timeline frames. */
  from: number;
  to: number;
  text: string;
  /** Blinks a few times as it lands. */
  flash?: boolean;
  /** Words land one at a time, this many frames apart. */
  beat?: number;
  /** Text colour. Default white. */
  color?: string;
  /** Colour of the edge around the letters. Default Elite blue. */
  edge?: string;
  /** Soft see-through band behind it: [top, height] as fractions of the frame. */
  band?: [number, number];
  /** Top of the text, as a fraction of the frame height. Default 0.2. */
  y?: number;
  /** Font size as a fraction of the frame width. Default 0.12. */
  size?: number;
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

/**
 * The explainer with Fien's own voice from the interviews, for Michael's
 * pitch to Normocare: 22s and the end card. Every line is hers, inside
 * the client's language (recovery, relaxation, groups; none of the
 * conditions or healing she also mentions), cut on the pauses in her
 * audio. She is on screen only when it is her own sound; the rest of her
 * voice runs over the chamber, the chairs and the drone.
 *
 *  frame  picture                          Fien
 *      0  the chamber from the air, panning "Het lichaam heeft zuurstof nodig om te herstellen."
 *     80  Fien, in the chamber              "Hier krijg je dubbel zoveel zuurstof gedurende
 *                                            twee uur lang."
 *    184  the aisle, a chair, the seats     "Je kan hier gewoon twee uur lang zitten, een boek
 *                                            lezen, een beetje tv kijken of gewoon rusten."
 *    314  Fien, then the crowd outside      "Je kan hier met zeventien personen plaatsnemen, dus
 *                                            daarom is het ideaal voor groepen of bedrijven die
 *                                            op zoek zijn naar een unieke locatie."
 *    497  the chamber, its logo             "De normobarische kamer is de enige in de Benelux."
 *    551  end card
 */
export const SHOTS_EXPLAINER_VO: Shot[] = [
  { id: "v01-air",    file: "25-DJI_20260905124246_0024_D.mp4", kind: "video", durationInFrames: 80,  startFrom: 150, pan: [18, 68], punch: false, accent: BRAND.oxygen },
  // In sync with her voice: 669 + 80 frames.
  { id: "v02-fien",   file: "08-6E8A6399.mp4",                  kind: "video", durationInFrames: 104, startFrom: 749,  focus: "57% 50%", punch: false, accent: BRAND.oxygen },
  { id: "v03-aisle",  file: "06-6E8A6397.mp4",                  kind: "video", durationInFrames: 42,  startFrom: 55,   focus: "57% 50%", move: "push", punch: false, accent: BRAND.oxygen },
  // The normocare logo on the headrest.
  { id: "v04-chair",  file: "18-6E8A6409.mp4",                  kind: "video", durationInFrames: 44,  startFrom: 186,  focus: "79% 50%", move: "push", punch: false, accent: BRAND.pulse },
  { id: "v05-row",    file: "05-6E8A6396.mp4",                  kind: "video", durationInFrames: 44,  startFrom: 250,  focus: "38% 50%", move: "push", punch: false, accent: BRAND.pulse },
  // In sync with her voice: 65 - 4 frames.
  { id: "v06-groups", file: "11-6E8A6402.mp4",                  kind: "video", durationInFrames: 106, startFrom: 61,   focus: "57% 50%", punch: false, accent: BRAND.oxygen },
  { id: "v07-crowd",  file: "23-DJI_20260905124037_0022_D.mp4", kind: "video", durationInFrames: 77,  startFrom: 1150, focus: "38% 50%", punch: false, accent: BRAND.oxygen },
  { id: "v08-logo",   file: "24-DJI_20260905124227_0023_D.mp4", kind: "video", durationInFrames: 54,  startFrom: 60,   focus: "23% 50%", move: "push", punch: false, accent: BRAND.oxygen },
];

const VOICE_EXPLAINER_VO: VoiceClip[] = [
  // 26.76-33.96s, after the cameraman's "En waarvoor doe je dat?".
  { id: "v-fien1-herstel",  file: "08-6E8A6399.mp4", from: 0,   startFrom: 669,  durationInFrames: 180, lufs: -20.94 },
  // 93.48-98.52s.
  { id: "v-fien2-rusten",   file: "08-6E8A6399.mp4", from: 188, startFrom: 2337, durationInFrames: 126, lufs: -19.72 },
  // 2.60-9.76s, after "Met hoeveel personen kan je hier zitten?".
  { id: "v-fien3-groepen",  file: "11-6E8A6402.mp4", from: 318, startFrom: 65,   durationInFrames: 179, lufs: -20.39 },
  // 101.44-103.44s, after "Dat is wel vrij uniek toch, zoiets?".
  { id: "v-fien4-benelux",  file: "08-6E8A6399.mp4", from: 501, startFrom: 2536, durationInFrames: 50,  lufs: -21.19 },
];

const SUBTITLES_EXPLAINER_VO: Subtitle[] = [
  { from: 1,   to: 35,  text: "Het lichaam heeft zuurstof nodig" },
  { from: 35,  to: 78,  text: "om te herstellen." },
  { from: 90,  to: 143, text: "Hier krijg je dubbel zoveel zuurstof" },
  { from: 143, to: 184, text: "gedurende twee uur lang." },
  { from: 188, to: 239, text: "Je kan hier gewoon twee uur lang zitten," },
  { from: 239, to: 289, text: "een boek lezen, een beetje tv kijken" },
  { from: 289, to: 314, text: "of gewoon rusten." },
  { from: 319, to: 375, text: "Je kan hier met zeventien personen plaatsnemen," },
  { from: 375, to: 440, text: "dus daarom is het ideaal voor groepen of bedrijven" },
  { from: 440, to: 497, text: "die op zoek zijn naar een unieke locatie." },
  { from: 501, to: 551, text: "De normobarische kamer is de enige in de Benelux." },
];

FILMS["ad-explainer-nl-vo"] = {
  id: "ad-explainer-nl-vo",
  label: "Zuurstofkamer - uitleg, met Fien (9:16)",
  format: "vertical",
  shots: SHOTS_EXPLAINER_VO,
  energy: "high",
  captions: {},
  voice: VOICE_EXPLAINER_VO,
  subtitles: SUBTITLES_EXPLAINER_VO,
  endCard: FILMS["ad-explainer-nl"].endCard,
  // 22s of Fien + the end card; Michael allowed up to 25s for the explainer.
  targetFrames: 551 + (FILMS["ad-explainer-nl"].endCard?.durationInFrames ?? 0),
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

/** Frame ranges where speech plays, so music can duck. */
export const speechRanges = (film: Film): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  for (const shot of film.shots) {
    if (shot.audible) ranges.push([cursor, cursor + shot.durationInFrames]);
    cursor += shot.durationInFrames;
  }
  for (const v of film.voice ?? []) ranges.push([v.from, v.from + v.durationInFrames]);
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
 * Films:
 *   elite-header-wide  the website header behind elitecleaning.be, 16:9.
 *                      No text, no sound (the site sets its own headline,
 *                      and browsers only autoplay muted video), and it
 *                      loops, so both ends fade. Elite only: no hotel, no
 *                      chamber, no Cobblestone banners.
 *   elite-header-vertical  the same header for phones, 9:16.
 *   elite-header-vertical-generic  the phone header with nothing of
 *                      Flanders Cobblestone, opening on Tino.
 *   elite-ad           the first spoken advert, 9:16, the glass gag and
 *                      Tino's lines (parked: the sound did not carry it).
 *   elite-bloopers     the takes that went wrong, with their sound.
 *   elite-tino-speaking  Tino answering a question, then his pitch.
 *   elite-ad-serious   silent advert: the work, four lines of copy, offer.
 *   elite-ad-tino      advert with Tino's own lines to camera, no questions.
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
  roof:     { file: "32-DJI_20260905124510_0032_D.mp4", startFrom: 43,    speed: 1.3, grade: ELITE_GRADE.drone },   // close on windows, glass railing, solar panels
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
  "m01-road": { gamma: 1, contrast: 1, saturation: 1.281, warmth: 1.02,
    curve: [0, 0.0196, 0.0389, 0.0581, 0.0777, 0.0978, 0.1187, 0.1401, 0.1616, 0.1834, 0.2059, 0.2291, 0.2535, 0.2792, 0.3065, 0.336, 0.3685, 0.4033, 0.4398, 0.4772, 0.515, 0.5526, 0.5904, 0.6291, 0.6696, 0.7125, 0.7594, 0.8165, 0.8694, 0.9076, 0.9397, 0.9693, 1] },
  "m02-cobbles": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.021, 0.0414, 0.0624, 0.0851, 0.1112, 0.142, 0.1754, 0.209, 0.2401, 0.2683, 0.2948, 0.3201, 0.3448, 0.3694, 0.3944, 0.4204, 0.448, 0.4775, 0.5098, 0.5469, 0.589, 0.6334, 0.6776, 0.7191, 0.7572, 0.794, 0.8299, 0.865, 0.8997, 0.9334, 0.9666, 1] },
  "m03-street": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0197, 0.0391, 0.0585, 0.0782, 0.0985, 0.1197, 0.142, 0.1655, 0.1897, 0.2142, 0.2389, 0.2633, 0.2872, 0.3101, 0.3312, 0.3503, 0.3684, 0.3862, 0.4045, 0.4239, 0.4454, 0.4695, 0.4973, 0.53, 0.5728, 0.6247, 0.6838, 0.7484, 0.8218, 0.904, 0.955, 1] },
  "m04-vanair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0244, 0.05, 0.0887, 0.1538, 0.228, 0.3067, 0.3627, 0.4094, 0.4506, 0.4873, 0.5207, 0.5519, 0.5813, 0.6086, 0.6342, 0.6583, 0.6814, 0.7037, 0.7255, 0.7471, 0.7689, 0.7911, 0.813, 0.8345, 0.8556, 0.8765, 0.8971, 0.9176, 0.9381, 0.9586, 0.9792, 1] },
  "m05-van": { gamma: 1, contrast: 1, saturation: 1.389, warmth: 1.02,
    curve: [0, 0.0288, 0.079, 0.1774, 0.2454, 0.2997, 0.342, 0.3786, 0.4112, 0.4406, 0.4676, 0.4931, 0.5181, 0.5432, 0.5695, 0.5978, 0.6275, 0.6578, 0.688, 0.7176, 0.7457, 0.7719, 0.796, 0.8188, 0.8405, 0.8614, 0.8817, 0.9014, 0.9209, 0.9403, 0.9598, 0.9797, 1] },
  "m06-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0285, 0.0597, 0.105, 0.1572, 0.196, 0.2294, 0.2596, 0.2875, 0.3137, 0.3389, 0.364, 0.3896, 0.4165, 0.4451, 0.474, 0.5029, 0.5319, 0.5611, 0.5907, 0.6208, 0.6514, 0.6828, 0.7151, 0.7496, 0.7853, 0.8207, 0.8544, 0.8854, 0.9148, 0.9433, 0.9714, 1] },
  "m07-ladderoff": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0307, 0.0658, 0.1163, 0.1679, 0.2111, 0.2521, 0.2908, 0.327, 0.3608, 0.392, 0.4207, 0.4475, 0.4726, 0.4966, 0.5199, 0.5429, 0.566, 0.5896, 0.6142, 0.6402, 0.6681, 0.6984, 0.7334, 0.7713, 0.8088, 0.8427, 0.8721, 0.8992, 0.9248, 0.9496, 0.9745, 1] },
  "m08-atvan": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0232, 0.0463, 0.07, 0.0948, 0.1208, 0.1475, 0.175, 0.2029, 0.2311, 0.2595, 0.2886, 0.3184, 0.3485, 0.3788, 0.4091, 0.4391, 0.4685, 0.4972, 0.5239, 0.5485, 0.5717, 0.5945, 0.6174, 0.6414, 0.667, 0.6952, 0.7267, 0.7622, 0.804, 0.8631, 0.9323, 1] },
  "m09-vanrear": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0263, 0.0562, 0.1134, 0.1764, 0.2206, 0.2593, 0.2938, 0.3255, 0.3556, 0.3856, 0.4146, 0.4424, 0.4691, 0.4948, 0.5197, 0.544, 0.5679, 0.5915, 0.6151, 0.6387, 0.6626, 0.687, 0.7114, 0.7317, 0.7489, 0.7649, 0.7819, 0.8019, 0.8272, 0.8597, 0.9016, 1] },
  "m10-carry": { gamma: 1, contrast: 1, saturation: 1.409, warmth: 1.02,
    curve: [0, 0.0436, 0.114, 0.1703, 0.2101, 0.243, 0.272, 0.3, 0.3298, 0.3642, 0.4054, 0.4515, 0.4995, 0.5465, 0.59, 0.6333, 0.6749, 0.7109, 0.739, 0.7642, 0.7873, 0.8088, 0.8287, 0.8475, 0.8652, 0.8822, 0.8986, 0.9148, 0.931, 0.9473, 0.9641, 0.9816, 1] },
  "m11-hero": { gamma: 1, contrast: 1, saturation: 1.13, warmth: 1.02,
    curve: [0, 0.0237, 0.0472, 0.0744, 0.1105, 0.1543, 0.1976, 0.2366, 0.2739, 0.3114, 0.3505, 0.393, 0.4434, 0.5011, 0.5562, 0.5993, 0.6338, 0.6646, 0.6925, 0.7183, 0.7427, 0.7665, 0.7905, 0.8137, 0.836, 0.8575, 0.8784, 0.8987, 0.9189, 0.9389, 0.9589, 0.9793, 1] },
  "m12-room": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0657, 0.1849, 0.3117, 0.3828, 0.4238, 0.4606, 0.4937, 0.5235, 0.5502, 0.5742, 0.5959, 0.6157, 0.6338, 0.6506, 0.6665, 0.6818, 0.6969, 0.7122, 0.7279, 0.7444, 0.7621, 0.7814, 0.8025, 0.8246, 0.8466, 0.8686, 0.8905, 0.9124, 0.9343, 0.9562, 0.9781, 1] },
  "m13-glass": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0539, 0.1155, 0.2254, 0.3725, 0.4245, 0.4645, 0.5001, 0.5319, 0.56, 0.585, 0.6072, 0.627, 0.6447, 0.6607, 0.6755, 0.6893, 0.7027, 0.7159, 0.7294, 0.7434, 0.7585, 0.775, 0.7932, 0.8136, 0.836, 0.8589, 0.8822, 0.9057, 0.9293, 0.9529, 0.9765, 1] },
  "m14-reflect": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0354, 0.07, 0.1035, 0.1365, 0.1697, 0.2037, 0.2382, 0.2731, 0.3083, 0.3437, 0.3792, 0.4147, 0.4504, 0.4862, 0.5222, 0.5582, 0.5942, 0.6301, 0.6665, 0.7046, 0.7422, 0.7767, 0.8061, 0.832, 0.8558, 0.878, 0.8989, 0.9191, 0.9388, 0.9586, 0.9789, 1] },
  "m15-solar": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.02, 0.0385, 0.0588, 0.0842, 0.1235, 0.182, 0.2276, 0.2668, 0.3028, 0.3366, 0.3694, 0.4021, 0.4356, 0.4691, 0.5022, 0.5348, 0.5669, 0.5982, 0.6288, 0.6584, 0.6869, 0.7135, 0.7388, 0.7634, 0.788, 0.813, 0.8392, 0.867, 0.8975, 0.9309, 0.9656, 1] },
  "m16-solarair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0212, 0.0414, 0.0632, 0.0887, 0.1227, 0.1651, 0.207, 0.2434, 0.2779, 0.3114, 0.3443, 0.3771, 0.4106, 0.4452, 0.4813, 0.5183, 0.5555, 0.5922, 0.6278, 0.6615, 0.693, 0.7231, 0.7522, 0.7805, 0.8083, 0.8361, 0.864, 0.8916, 0.9188, 0.9459, 0.9729, 1] },
  "m17-hotel": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0207, 0.0404, 0.0611, 0.0844, 0.1125, 0.1477, 0.1871, 0.227, 0.2684, 0.312, 0.3556, 0.397, 0.4344, 0.4689, 0.5015, 0.5328, 0.5636, 0.5943, 0.6258, 0.6586, 0.6939, 0.7321, 0.7705, 0.8061, 0.8363, 0.863, 0.8877, 0.9108, 0.933, 0.9548, 0.977, 1] },
  "m18-rise": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0245, 0.0495, 0.0827, 0.1349, 0.1883, 0.2355, 0.2811, 0.326, 0.371, 0.4179, 0.4659, 0.5122, 0.5542, 0.5897, 0.6217, 0.6513, 0.6789, 0.705, 0.7298, 0.7539, 0.7775, 0.8002, 0.8219, 0.8429, 0.8632, 0.883, 0.9024, 0.9217, 0.9409, 0.9603, 0.9799, 1] },
  "m19-road2": { gamma: 1, contrast: 1, saturation: 1.198, warmth: 1.02,
    curve: [0, 0.0237, 0.0475, 0.071, 0.0937, 0.115, 0.1349, 0.1541, 0.1731, 0.1923, 0.2123, 0.2336, 0.2566, 0.282, 0.3101, 0.3439, 0.3836, 0.4272, 0.4727, 0.5184, 0.5673, 0.6186, 0.6692, 0.7166, 0.7632, 0.8073, 0.8449, 0.8758, 0.903, 0.9278, 0.9515, 0.9751, 1] },
  "m20-village": { gamma: 1, contrast: 1, saturation: 1.26, warmth: 1.02,
    curve: [0, 0.0246, 0.0504, 0.0891, 0.1533, 0.1991, 0.2365, 0.2698, 0.2999, 0.3279, 0.3548, 0.3817, 0.4096, 0.4379, 0.4649, 0.491, 0.5166, 0.5418, 0.5671, 0.5926, 0.6188, 0.6458, 0.674, 0.7038, 0.736, 0.7713, 0.8079, 0.8439, 0.8775, 0.909, 0.9395, 0.9696, 1] },
  "g01-reflect": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0354, 0.07, 0.1035, 0.1365, 0.1697, 0.2037, 0.2382, 0.2731, 0.3083, 0.3437, 0.3792, 0.4147, 0.4504, 0.4862, 0.5222, 0.5582, 0.5942, 0.6301, 0.6665, 0.7046, 0.7422, 0.7767, 0.8061, 0.832, 0.8558, 0.878, 0.8989, 0.9191, 0.9388, 0.9586, 0.9789, 1] },
  "g02-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0285, 0.0597, 0.105, 0.1572, 0.196, 0.2294, 0.2596, 0.2875, 0.3137, 0.3389, 0.364, 0.3896, 0.4165, 0.4451, 0.474, 0.5029, 0.5319, 0.5611, 0.5907, 0.6208, 0.6514, 0.6828, 0.7151, 0.7496, 0.7853, 0.8207, 0.8544, 0.8854, 0.9148, 0.9433, 0.9714, 1] },
  "g03-ladderoff": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0307, 0.0658, 0.1163, 0.1679, 0.2111, 0.2521, 0.2908, 0.327, 0.3608, 0.392, 0.4207, 0.4475, 0.4726, 0.4966, 0.5199, 0.5429, 0.566, 0.5896, 0.6142, 0.6402, 0.6681, 0.6984, 0.7334, 0.7713, 0.8088, 0.8427, 0.8721, 0.8992, 0.9248, 0.9496, 0.9745, 1] },
  "g04-glass": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0539, 0.1155, 0.2254, 0.3725, 0.4245, 0.4645, 0.5001, 0.5319, 0.56, 0.585, 0.6072, 0.627, 0.6447, 0.6607, 0.6755, 0.6893, 0.7027, 0.7159, 0.7294, 0.7434, 0.7585, 0.775, 0.7932, 0.8136, 0.836, 0.8589, 0.8822, 0.9057, 0.9293, 0.9529, 0.9765, 1] },
  "g05-roof": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0284, 0.057, 0.0859, 0.1152, 0.1446, 0.1742, 0.2037, 0.2331, 0.262, 0.2907, 0.3194, 0.3482, 0.3774, 0.4072, 0.4377, 0.4692, 0.502, 0.5361, 0.571, 0.6063, 0.6418, 0.6769, 0.7115, 0.746, 0.7806, 0.8148, 0.8482, 0.8802, 0.9108, 0.9407, 0.9702, 1] },
  "g06-vanrear": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0263, 0.0562, 0.1134, 0.1764, 0.2206, 0.2593, 0.2938, 0.3255, 0.3556, 0.3856, 0.4146, 0.4424, 0.4691, 0.4948, 0.5197, 0.544, 0.5679, 0.5915, 0.6151, 0.6387, 0.6626, 0.687, 0.7114, 0.7317, 0.7489, 0.7649, 0.7819, 0.8019, 0.8272, 0.8597, 0.9016, 1] },
  "g07-room": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0657, 0.1849, 0.3117, 0.3828, 0.4238, 0.4606, 0.4937, 0.5235, 0.5502, 0.5742, 0.5959, 0.6157, 0.6338, 0.6506, 0.6665, 0.6818, 0.6969, 0.7122, 0.7279, 0.7444, 0.7621, 0.7814, 0.8025, 0.8246, 0.8466, 0.8686, 0.8905, 0.9124, 0.9343, 0.9562, 0.9781, 1] },
  "g08-solar": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.02, 0.0385, 0.0588, 0.0842, 0.1235, 0.182, 0.2276, 0.2668, 0.3028, 0.3366, 0.3694, 0.4021, 0.4356, 0.4691, 0.5022, 0.5348, 0.5669, 0.5982, 0.6288, 0.6584, 0.6869, 0.7135, 0.7388, 0.7634, 0.788, 0.813, 0.8392, 0.867, 0.8975, 0.9309, 0.9656, 1] },
  "g09-atvan": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0232, 0.0463, 0.07, 0.0948, 0.1208, 0.1475, 0.175, 0.2029, 0.2311, 0.2595, 0.2886, 0.3184, 0.3485, 0.3788, 0.4091, 0.4391, 0.4685, 0.4972, 0.5239, 0.5485, 0.5717, 0.5945, 0.6174, 0.6414, 0.667, 0.6952, 0.7267, 0.7622, 0.804, 0.8631, 0.9323, 1] },
  "g10-vanair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0244, 0.05, 0.0887, 0.1538, 0.228, 0.3067, 0.3627, 0.4094, 0.4506, 0.4873, 0.5207, 0.5519, 0.5813, 0.6086, 0.6342, 0.6583, 0.6814, 0.7037, 0.7255, 0.7471, 0.7689, 0.7911, 0.813, 0.8345, 0.8556, 0.8765, 0.8971, 0.9176, 0.9381, 0.9586, 0.9792, 1] },
  "g11-van": { gamma: 1, contrast: 1, saturation: 1.389, warmth: 1.02,
    curve: [0, 0.0288, 0.079, 0.1774, 0.2454, 0.2997, 0.342, 0.3786, 0.4112, 0.4406, 0.4676, 0.4931, 0.5181, 0.5432, 0.5695, 0.5978, 0.6275, 0.6578, 0.688, 0.7176, 0.7457, 0.7719, 0.796, 0.8188, 0.8405, 0.8614, 0.8817, 0.9014, 0.9209, 0.9403, 0.9598, 0.9797, 1] },
  "g12-solarair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0212, 0.0414, 0.0632, 0.0887, 0.1227, 0.1651, 0.207, 0.2434, 0.2779, 0.3114, 0.3443, 0.3771, 0.4106, 0.4452, 0.4813, 0.5183, 0.5555, 0.5922, 0.6278, 0.6615, 0.693, 0.7231, 0.7522, 0.7805, 0.8083, 0.8361, 0.864, 0.8916, 0.9188, 0.9459, 0.9729, 1] },
  "g13-church": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0208, 0.0404, 0.0619, 0.0884, 0.1266, 0.1768, 0.2286, 0.2843, 0.3412, 0.3956, 0.4514, 0.5057, 0.5532, 0.5896, 0.6205, 0.6483, 0.6735, 0.6967, 0.7185, 0.7396, 0.7606, 0.7822, 0.8048, 0.8274, 0.8496, 0.8714, 0.8929, 0.9143, 0.9357, 0.957, 0.9784, 1] },
  "g14-road": { gamma: 1, contrast: 1, saturation: 1.281, warmth: 1.02,
    curve: [0, 0.0196, 0.0389, 0.0581, 0.0777, 0.0978, 0.1187, 0.1401, 0.1616, 0.1834, 0.2059, 0.2291, 0.2535, 0.2792, 0.3065, 0.336, 0.3685, 0.4033, 0.4398, 0.4772, 0.515, 0.5526, 0.5904, 0.6291, 0.6696, 0.7125, 0.7594, 0.8165, 0.8694, 0.9076, 0.9397, 0.9693, 1] },
  "g15-road2": { gamma: 1, contrast: 1, saturation: 1.198, warmth: 1.02,
    curve: [0, 0.0237, 0.0475, 0.071, 0.0937, 0.115, 0.1349, 0.1541, 0.1731, 0.1923, 0.2123, 0.2336, 0.2566, 0.282, 0.3101, 0.3439, 0.3836, 0.4272, 0.4727, 0.5184, 0.5673, 0.6186, 0.6692, 0.7166, 0.7632, 0.8073, 0.8449, 0.8758, 0.903, 0.9278, 0.9515, 0.9751, 1] },
  "a01-glass": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.1087, 0.2116, 0.2818, 0.3288, 0.3637, 0.3947, 0.4223, 0.4469, 0.4689, 0.4888, 0.5071, 0.524, 0.54, 0.5557, 0.5713, 0.5874, 0.6043, 0.6225, 0.6424, 0.6644, 0.6881, 0.7122, 0.7368, 0.7621, 0.788, 0.8148, 0.8424, 0.8709, 0.9012, 0.9337, 0.967, 1] },
  "a02-arrive": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0244, 0.05, 0.0887, 0.1538, 0.228, 0.3067, 0.3627, 0.4094, 0.4506, 0.4873, 0.5207, 0.5519, 0.5813, 0.6086, 0.6342, 0.6583, 0.6814, 0.7037, 0.7255, 0.7471, 0.7689, 0.7911, 0.813, 0.8345, 0.8556, 0.8765, 0.8971, 0.9176, 0.9381, 0.9586, 0.9792, 1] },
  "a03-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0285, 0.0597, 0.105, 0.1572, 0.196, 0.2294, 0.2596, 0.2875, 0.3137, 0.3389, 0.364, 0.3896, 0.4165, 0.4451, 0.474, 0.5029, 0.5319, 0.5611, 0.5907, 0.6208, 0.6514, 0.6828, 0.7151, 0.7496, 0.7853, 0.8207, 0.8544, 0.8854, 0.9148, 0.9433, 0.9714, 1] },
  "a04-check": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0557, 0.0929, 0.1236, 0.1506, 0.177, 0.2048, 0.231, 0.2557, 0.2795, 0.3027, 0.3259, 0.3495, 0.3741, 0.4002, 0.4281, 0.4585, 0.4921, 0.5301, 0.572, 0.6168, 0.6637, 0.7148, 0.7744, 0.8195, 0.8505, 0.877, 0.9001, 0.9206, 0.9399, 0.9588, 0.9785, 1] },
  "a05-grin": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0422, 0.0792, 0.113, 0.1449, 0.1758, 0.2064, 0.2359, 0.2644, 0.2923, 0.32, 0.3476, 0.3755, 0.4041, 0.4335, 0.4638, 0.4943, 0.525, 0.5562, 0.5883, 0.6213, 0.6556, 0.6913, 0.7315, 0.7757, 0.8176, 0.8513, 0.8799, 0.9056, 0.9295, 0.9525, 0.9757, 1] },
  "a06-proper": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0519, 0.0892, 0.1208, 0.1493, 0.1768, 0.205, 0.2316, 0.2567, 0.2808, 0.3044, 0.3279, 0.3518, 0.3766, 0.4028, 0.4307, 0.461, 0.494, 0.5304, 0.5697, 0.6118, 0.6563, 0.7039, 0.763, 0.8142, 0.8469, 0.8745, 0.8983, 0.9195, 0.9391, 0.9583, 0.9782, 1] },
  "b01-opnemen": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2188, 0.25, 0.2813, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4687, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8437, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b02-error": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2812, 0.3125, 0.3437, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5937, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b02z-error": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2188, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b02y-normaal": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2188, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b04-enthousiast": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.1084, 0.2157, 0.289, 0.3346, 0.3691, 0.3998, 0.4271, 0.4513, 0.473, 0.4924, 0.5102, 0.5266, 0.5421, 0.5571, 0.572, 0.5873, 0.6033, 0.6205, 0.6393, 0.6601, 0.6832, 0.7072, 0.7318, 0.757, 0.7831, 0.8101, 0.838, 0.8669, 0.8975, 0.9309, 0.9656, 1] },
  "b05-glasramen": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2188, 0.25, 0.2812, 0.3125, 0.3437, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8437, 0.875, 0.9063, 0.9375, 0.9688, 1] },
  "b06-kijken": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b06b-mij": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b07-bloopers": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2813, 0.3125, 0.3437, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6563, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b07a-de": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2813, 0.3125, 0.3437, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6563, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "b08-proper": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0354, 0.07, 0.1035, 0.1365, 0.1697, 0.2037, 0.2382, 0.2731, 0.3083, 0.3437, 0.3792, 0.4147, 0.4504, 0.4862, 0.5222, 0.5582, 0.5942, 0.6301, 0.6665, 0.7046, 0.7422, 0.7767, 0.8061, 0.832, 0.8558, 0.878, 0.8989, 0.9191, 0.9388, 0.9586, 0.9789, 1] },
  "t01-vraag": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0937, 0.125, 0.1562, 0.1875, 0.2188, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "t02-reflect": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0354, 0.07, 0.1035, 0.1365, 0.1697, 0.2037, 0.2382, 0.2731, 0.3083, 0.3437, 0.3792, 0.4147, 0.4504, 0.4862, 0.5222, 0.5582, 0.5942, 0.6301, 0.6665, 0.7046, 0.7422, 0.7767, 0.8061, 0.832, 0.8558, 0.878, 0.8989, 0.9191, 0.9388, 0.9586, 0.9789, 1] },
  "t03-glass": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0539, 0.1155, 0.2254, 0.3725, 0.4245, 0.4645, 0.5001, 0.5319, 0.56, 0.585, 0.6072, 0.627, 0.6447, 0.6607, 0.6755, 0.6893, 0.7027, 0.7159, 0.7294, 0.7434, 0.7585, 0.775, 0.7932, 0.8136, 0.836, 0.8589, 0.8822, 0.9057, 0.9293, 0.9529, 0.9765, 1] },
  "t04-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0285, 0.0597, 0.105, 0.1572, 0.196, 0.2294, 0.2596, 0.2875, 0.3137, 0.3389, 0.364, 0.3896, 0.4165, 0.4451, 0.474, 0.5029, 0.5319, 0.5611, 0.5907, 0.6208, 0.6514, 0.6828, 0.7151, 0.7496, 0.7853, 0.8207, 0.8544, 0.8854, 0.9148, 0.9433, 0.9714, 1] },
  "t05-ladder": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0307, 0.0658, 0.1163, 0.1679, 0.2111, 0.2521, 0.2908, 0.327, 0.3608, 0.392, 0.4207, 0.4475, 0.4726, 0.4966, 0.5199, 0.5429, 0.566, 0.5896, 0.6142, 0.6402, 0.6681, 0.6984, 0.7334, 0.7713, 0.8088, 0.8427, 0.8721, 0.8992, 0.9248, 0.9496, 0.9745, 1] },
  "t06-ingang": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "p01-vanair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0244, 0.05, 0.0887, 0.1538, 0.228, 0.3067, 0.3627, 0.4094, 0.4506, 0.4873, 0.5207, 0.5519, 0.5813, 0.6086, 0.6342, 0.6583, 0.6814, 0.7037, 0.7255, 0.7471, 0.7689, 0.7911, 0.813, 0.8345, 0.8556, 0.8765, 0.8971, 0.9176, 0.9381, 0.9586, 0.9792, 1] },
  "p02-out": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0285, 0.0597, 0.105, 0.1572, 0.196, 0.2294, 0.2596, 0.2875, 0.3137, 0.3389, 0.364, 0.3896, 0.4165, 0.4451, 0.474, 0.5029, 0.5319, 0.5611, 0.5907, 0.6208, 0.6514, 0.6828, 0.7151, 0.7496, 0.7853, 0.8207, 0.8544, 0.8854, 0.9148, 0.9433, 0.9714, 1] },
  "p03-ladderoff": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0307, 0.0658, 0.1163, 0.1679, 0.2111, 0.2521, 0.2908, 0.327, 0.3608, 0.392, 0.4207, 0.4475, 0.4726, 0.4966, 0.5199, 0.5429, 0.566, 0.5896, 0.6142, 0.6402, 0.6681, 0.6984, 0.7334, 0.7713, 0.8088, 0.8427, 0.8721, 0.8992, 0.9248, 0.9496, 0.9745, 1] },
  "p04-glass": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0539, 0.1155, 0.2254, 0.3725, 0.4245, 0.4645, 0.5001, 0.5319, 0.56, 0.585, 0.6072, 0.627, 0.6447, 0.6607, 0.6755, 0.6893, 0.7027, 0.7159, 0.7294, 0.7434, 0.7585, 0.775, 0.7932, 0.8136, 0.836, 0.8589, 0.8822, 0.9057, 0.9293, 0.9529, 0.9765, 1] },
  "p05-reflect": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0354, 0.07, 0.1035, 0.1365, 0.1697, 0.2037, 0.2382, 0.2731, 0.3083, 0.3437, 0.3792, 0.4147, 0.4504, 0.4862, 0.5222, 0.5582, 0.5942, 0.6301, 0.6665, 0.7046, 0.7422, 0.7767, 0.8061, 0.832, 0.8558, 0.878, 0.8989, 0.9191, 0.9388, 0.9586, 0.9789, 1] },
  "p06-room": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0657, 0.1849, 0.3117, 0.3828, 0.4238, 0.4606, 0.4937, 0.5235, 0.5502, 0.5742, 0.5959, 0.6157, 0.6338, 0.6506, 0.6665, 0.6818, 0.6969, 0.7122, 0.7279, 0.7444, 0.7621, 0.7814, 0.8025, 0.8246, 0.8466, 0.8686, 0.8905, 0.9124, 0.9343, 0.9562, 0.9781, 1] },
  "p07-roof": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0284, 0.057, 0.0859, 0.1152, 0.1446, 0.1742, 0.2037, 0.2331, 0.262, 0.2907, 0.3194, 0.3482, 0.3774, 0.4072, 0.4377, 0.4692, 0.502, 0.5361, 0.571, 0.6063, 0.6418, 0.6769, 0.7115, 0.746, 0.7806, 0.8148, 0.8482, 0.8802, 0.9108, 0.9407, 0.9702, 1] },
  "p08-solar": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0198, 0.038, 0.0579, 0.083, 0.1224, 0.1839, 0.2299, 0.2693, 0.305, 0.3385, 0.3709, 0.4034, 0.4368, 0.4701, 0.5031, 0.5356, 0.5675, 0.5987, 0.629, 0.6585, 0.6868, 0.7132, 0.7382, 0.7625, 0.7867, 0.8115, 0.8374, 0.8651, 0.8954, 0.9293, 0.9648, 1] },
  "p09-solarair": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0212, 0.0414, 0.0632, 0.0887, 0.1227, 0.1651, 0.207, 0.2434, 0.2779, 0.3114, 0.3443, 0.3771, 0.4106, 0.4452, 0.4813, 0.5183, 0.5555, 0.5922, 0.6278, 0.6615, 0.693, 0.7231, 0.7522, 0.7805, 0.8083, 0.8361, 0.864, 0.8916, 0.9188, 0.9459, 0.9729, 1] },
  "p10-van": { gamma: 1, contrast: 1, saturation: 1.389, warmth: 1.02,
    curve: [0, 0.0288, 0.079, 0.1774, 0.2454, 0.2997, 0.342, 0.3786, 0.4112, 0.4406, 0.4676, 0.4931, 0.5181, 0.5432, 0.5695, 0.5978, 0.6275, 0.6578, 0.688, 0.7176, 0.7457, 0.7719, 0.796, 0.8188, 0.8405, 0.8614, 0.8817, 0.9014, 0.9209, 0.9403, 0.9598, 0.9797, 1] },
  "p11-atvan": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0232, 0.0463, 0.07, 0.0948, 0.1208, 0.1475, 0.175, 0.2029, 0.2311, 0.2595, 0.2886, 0.3184, 0.3485, 0.3788, 0.4091, 0.4391, 0.4685, 0.4972, 0.5239, 0.5485, 0.5717, 0.5945, 0.6174, 0.6414, 0.667, 0.6952, 0.7267, 0.7622, 0.804, 0.8631, 0.9323, 1] },
  "p12-vanrear": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0263, 0.0562, 0.1134, 0.1764, 0.2206, 0.2593, 0.2938, 0.3255, 0.3556, 0.3856, 0.4146, 0.4424, 0.4691, 0.4948, 0.5197, 0.544, 0.5679, 0.5915, 0.6151, 0.6387, 0.6626, 0.687, 0.7114, 0.7317, 0.7489, 0.7649, 0.7819, 0.8019, 0.8272, 0.8597, 0.9016, 1] },
  "e01-ingang": { gamma: 1, contrast: 1, saturation: 1.1, warmth: 1.02,
    curve: [0, 0.0312, 0.0625, 0.0938, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2812, 0.3125, 0.3438, 0.375, 0.4062, 0.4375, 0.4688, 0.5, 0.5312, 0.5625, 0.5938, 0.625, 0.6562, 0.6875, 0.7188, 0.75, 0.7812, 0.8125, 0.8438, 0.875, 0.9062, 0.9375, 0.9688, 1] },
  "e02-ladder": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0307, 0.0658, 0.1163, 0.1679, 0.2111, 0.2521, 0.2908, 0.327, 0.3608, 0.392, 0.4207, 0.4475, 0.4726, 0.4966, 0.5199, 0.5429, 0.566, 0.5896, 0.6142, 0.6402, 0.6681, 0.6984, 0.7334, 0.7713, 0.8088, 0.8427, 0.8721, 0.8992, 0.9248, 0.9496, 0.9745, 1] },
  "e03-roof": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.0284, 0.057, 0.0859, 0.1152, 0.1446, 0.1742, 0.2037, 0.2331, 0.262, 0.2907, 0.3194, 0.3482, 0.3774, 0.4072, 0.4377, 0.4692, 0.502, 0.5361, 0.571, 0.6063, 0.6418, 0.6769, 0.7115, 0.746, 0.7806, 0.8148, 0.8482, 0.8802, 0.9108, 0.9407, 0.9702, 1] },
  "e04-kwaliteit": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0578, 0.1332, 0.2178, 0.298, 0.3605, 0.4008, 0.4369, 0.4699, 0.5002, 0.5282, 0.5539, 0.5778, 0.6001, 0.621, 0.6409, 0.6599, 0.6785, 0.6968, 0.7151, 0.7337, 0.7529, 0.7729, 0.7941, 0.8166, 0.8398, 0.8628, 0.8858, 0.9086, 0.9315, 0.9543, 0.9771, 1] },
  "e05-solar": { gamma: 1, contrast: 1, saturation: 1.45, warmth: 1.02,
    curve: [0, 0.02, 0.0385, 0.0588, 0.0842, 0.1235, 0.182, 0.2276, 0.2668, 0.3028, 0.3366, 0.3694, 0.4021, 0.4356, 0.4691, 0.5022, 0.5348, 0.5669, 0.5982, 0.6288, 0.6584, 0.6869, 0.7135, 0.7388, 0.7634, 0.788, 0.813, 0.8392, 0.867, 0.8975, 0.9309, 0.9656, 1] },
  "e06-proper": { gamma: 1, contrast: 1, saturation: 1.0, warmth: 1.02,
    curve: [0, 0.0543, 0.1264, 0.2092, 0.2896, 0.3542, 0.396, 0.4323, 0.4657, 0.4963, 0.5246, 0.5506, 0.5748, 0.5974, 0.6186, 0.6387, 0.658, 0.6768, 0.6953, 0.7138, 0.7325, 0.7518, 0.7718, 0.793, 0.8155, 0.8388, 0.862, 0.885, 0.9081, 0.931, 0.954, 0.977, 1] },
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
 * Mobile website header: the desktop header's shots, re-framed for 9:16.
 * focus is where the subject sits across the 16:9 frame, taken from the
 * contact sheets, so Tino is in the middle of every shot he is in. The
 * van's drone shot keeps the fixed 18% slice it stays inside for its whole
 * length.
 *
 * Fewer indoor shots than the desktop header, after Michael's review: one
 * of the three near-identical takes of Tino by the bicycle wall, no door
 * opening from inside (the drone has just shown the entrance), and no
 * crouch in the dark corner. Their time went to the outdoor and drone
 * shots.
 */
const MOBILE_FOCUS: Record<string, string> = {
  road: "50% 50%", cobbles: "45% 50%", street: "30% 50%", vanAir: "18% 50%",
  van: "80% 50%", out: "38% 50%", ladderOff: "4% 50%", atVan: "25% 50%",
  vanRear: "45% 50%", carry: "55% 50%", hero: "45% 50%",
  // Tino stands at 55-65% of the frame by the bicycle wall.
  room: "64% 50%",
  glass: "46% 50%",
  // Washing the window outside: his face is at 63%, his arm out to 93%.
  // Framed on the face, so he is not pushed against the left edge.
  reflect: "70% 50%",
  solar: "40% 50%", solarAir: "50% 50%",
  hotel: "50% 50%", rise: "50% 50%", road2: "50% 50%", village: "50% 50%",
  roof: "50% 50%", church: "76% 50%", churchAir: "56% 50%",
};
const MOBILE_ORDER: Array<[keyof typeof S, number]> = [
  ["road", 22], ["cobbles", 18], ["street", 16], ["vanAir", 44], ["van", 16], ["out", 34],
  ["ladderOff", 20], ["atVan", 16], ["vanRear", 18], ["carry", 32], ["hero", 32], ["room", 26],
  ["glass", 28], ["reflect", 40], ["solar", 24], ["solarAir", 24], ["hotel", 18], ["rise", 32],
  ["road2", 16], ["village", 24],
];
export const SHOTS_ELITE_MOBILE: Shot[] = graded(inProject("elite",
  MOBILE_ORDER.map(([key, frames], i) => ({
    id: `m${String(i + 1).padStart(2, "0")}-${key.toLowerCase()}`,
    ...S[key],
    kind: "video" as const,
    durationInFrames: frames,
    focus: MOBILE_FOCUS[key],
  })),
));

/**
 * Advert: Tino's own voice from the shoot, 16.2s of story and the logo.
 * Michael's brief: a clear story, Tino in the middle of the frame, no
 * left-right pans, nothing random, and Tino speaking from the start.
 *
 *  frame  picture                        sound (the shoot's own audio)
 *      0  someone walks into the glass   "Oh, pas op, de raam is toe!"
 *         Tino has just cleaned          "Oh, ik had dat niet gezien."
 *    121  the van drives in, from the air  "Dan is een propere ingang
 *    171  Tino steps out                    een visitekaartje van uw bedrijf."
 *    222  Tino at the window, on camera  "Ik ben nu de kwaliteit aan het
 *    276  grinning at the glass           controleren, dat we toch proper
 *                                         alles achterlaten."
 *    316  Tino at the window, on camera  "En?" ... "Het is proper!"
 *    406  logo
 *
 * The shots are muted; the voice is its own track (`voice`), so a sentence
 * runs on across a cutaway. Where the picture is the same clip as the
 * voice (a01, a04, a06), the in-point is set so lips and words line up.
 * Lines are cut on the pauses found in the audio, not on the transcript's
 * whole seconds. Tino's lines keep "u" as he said it: these are his
 * words, not the brand's copy.
 */
export const SHOTS_ELITE_AD: Shot[] = graded(inProject("elite", [
  // Take 3 of the glass gag. At 28.8s, just before the bump, the person
  // walking in is at 22-39% of the frame and Tino, outside, at 48-58%: a
  // slice at 38% holds most of both. No push: zooming in would take the
  // two of them off the edges.
  { id: "a01-glass",  file: "06-6E8A6376.mp4", startFrom: 649, grade: ELITE_GRADE.indoor,
    kind: "video", durationInFrames: 121, focus: "38% 50%", punch: false },
  // The van stays inside a fixed slice at 18% for the whole beat.
  { id: "a02-arrive", ...S.vanAir, speed: 1.2, kind: "video", durationInFrames: 50, focus: "18% 50%", move: "push", punch: false },
  { id: "a03-out",    ...S.out,                kind: "video", durationInFrames: 51, focus: "38% 50%", move: "push", punch: false },
  // Tino stands at 55% of clip 03 from 14s to the end.
  { id: "a04-check",  file: "03-6E8A6373.mp4", startFrom: 374, grade: ELITE_GRADE.indoor,
    kind: "video", durationInFrames: 54, focus: "57% 50%", move: "push", punch: false },
  { id: "a05-grin",   ...S.reflect,            kind: "video", durationInFrames: 40, focus: "91% 50%", move: "push", punch: false },
  { id: "a06-proper", file: "03-6E8A6373.mp4", startFrom: 480, grade: ELITE_GRADE.indoor,
    kind: "video", durationInFrames: 90, focus: "57% 50%", move: "push", punch: false },
]));

/** Tino's sound for the advert. Ranges come from the silences in out/elite/audio. */
const VOICE_ELITE_AD: VoiceClip[] = [
  // 25.96-30.80s: the warning, the bump on the glass, the reply. Stops
  // before a half-heard "ja, dat klopt wel" at 30.9s.
  { id: "a-voice1-glass",   file: "06-6E8A6376.mp4", project: "elite", from: 0,   startFrom: 649, durationInFrames: 121, lufs: -17.57 },
  // 60.00-63.96s: the last, cleanest take, looking into the lens.
  { id: "a-voice2-ingang",  file: "10-6E8A6380.mp4", project: "elite", from: 121, startFrom: 1500, durationInFrames: 99, lufs: -21.23 },
  // 15.08-18.80s, in sync with a04 (374 + 3 frames).
  { id: "a-voice3-check",   file: "03-6E8A6373.mp4", project: "elite", from: 225, startFrom: 377, durationInFrames: 93, lufs: -24.2 },
  // 19.28-22.80s, in sync with a06 (480 + 2 frames): the question, the
  // pause he leaves, the answer.
  { id: "a-voice4-proper",  file: "03-6E8A6373.mp4", project: "elite", from: 318, startFrom: 482, durationInFrames: 88, lufs: -14.54 },
];

const SUBTITLES_ELITE_AD: Subtitle[] = [
  { from: 5,   to: 84,  text: "Oh, pas op, de raam is toe!" },
  { from: 84,  to: 121, text: "Oh, ik had dat niet gezien." },
  { from: 122, to: 162, text: "Dan is een propere ingang" },
  { from: 162, to: 221, text: "een visitekaartje van uw bedrijf." },
  { from: 225, to: 284, text: "Ik ben nu de kwaliteit aan het controleren," },
  { from: 284, to: 318, text: "dat we toch proper alles achterlaten." },
  { from: 318, to: 352, text: "En?" },
  { from: 362, to: 406, text: "Het is proper!" },
];

/**
 * The same mobile header for anywhere on elitecleaning.be, not about one
 * client: nothing that names or points at Flanders Cobblestone. Out: Tino
 * at the entrance between the hotel's banners (both drone shots), the walk
 * with the ladder past the lettering on the building, the hotel from the
 * air, the street with the cyclists, and the cobbled street that flies
 * towards the hotel's lettering. In: the roof close up (windows,
 * glass railing, solar panels) and the church in its village.
 *
 * A mix rather than the arrival in order: it opens on Tino himself, his
 * grin at the window and stepping out of the van, and keeps him coming
 * back between the roofs and panels; the church and the streets close it.
 * Every shot it shares with the mobile header keeps that shot's moment,
 * framing and grade.
 */
const GENERIC_ORDER: Array<[keyof typeof S, number]> = [
  ["reflect", 44], ["out", 40], ["ladderOff", 30], ["glass", 36], ["roof", 36], ["vanRear", 28],
  ["room", 32], ["solar", 32], ["atVan", 24], ["vanAir", 48], ["van", 24], ["solarAir", 34],
  ["church", 30], ["road", 32], ["road2", 30],
];
export const SHOTS_ELITE_GENERIC: Shot[] = graded(inProject("elite",
  GENERIC_ORDER.map(([key, frames], i) => ({
    id: `g${String(i + 1).padStart(2, "0")}-${key.toLowerCase()}`,
    ...S[key],
    kind: "video" as const,
    durationInFrames: frames,
    focus: MOBILE_FOCUS[key],
  })),
));

/**
 * Light card: the logo is black and dark grey on light-blue bubbles and
 * disappears on navy, and it may not be altered - so the card goes light
 * rather than the logo going white.
 */
const ELITE_END_CARD: NonNullable<Film["endCard"]> = {
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
};

/**
 * Sound for shots that carry their own: one voice clip per listed shot, in
 * sync with its picture and placed where that shot sits on the timeline.
 * lufs is measured per stretch from out/elite/audio.
 */
const ownSound = (shots: Shot[], lufs: Record<string, number>): VoiceClip[] => {
  const clips: VoiceClip[] = [];
  let from = 0;
  for (const shot of shots) {
    if (shot.id in lufs && shot.file) {
      clips.push({
        id: `${shot.id}-sound`, file: shot.file, project: shot.project, from,
        startFrom: shot.startFrom ?? 0, durationInFrames: shot.durationInFrames,
        lufs: lufs[shot.id], generated: shot.generated,
      });
    }
    from += shot.durationInFrames;
  }
  return clips;
};

/** A talking-head clip from the shoot, its own sound in sync. */
const take = (id: string, file: string, startSec: number, seconds: number, focus: string): Shot => ({
  id, file, kind: "video", startFrom: Math.round(startSec * FPS),
  durationInFrames: Math.round(seconds * FPS), focus, punch: false,
  grade: ELITE_GRADE.outdoor,
});

/**
 * Bloopers: the takes that went wrong, with their own sound and subtitles.
 * 36s and the logo, for social. Cut on the pauses in the audio. In order:
 * the camera already rolling, Tino's "Error.", the crew fluffing the
 * question, take 2 of the glass gag and the note that came after it, the
 * argument about "glasramen", "naar mij kijken", and someone on set
 * naming the reel. The entrance banners are mostly outside the 9:16
 * slice; where an edge shows, that is fine for a reel shot on location.
 */
export const SHOTS_ELITE_BLOOPERS: Shot[] = graded(inProject("elite", [
  // Michael: 25s, fast. Every take is cut to its words, the pauses
  // between takes go, and the weakest beat ("Hé Tino, hoeveel keer...
  // Nee.") is out.
  // In at 0.44s: the half second before it is only rustle on the mic.
  take("b01-opnemen",     "07-6E8A6377.mp4",   0.44, 1.16, "50% 50%"),
  take("b02-error",       "10-6E8A6380.mp4",  12.00, 3.28, "53% 50%"),
  // Snap-zoom onto his face for "Error." (16.68-17.12s), then the
  // generated screen flashing ERROR, sped up, then back for his answer.
  { ...take("b02z-error",  "10-6E8A6380.mp4",  16.60, 0.60, "53% 50%"), zoom: 1.6, zoomOrigin: "50% 16%" },
  // Only the red screen with ERROR blinking (2.0s to the end), at 2x.
  { id: "c01-error", file: "error.mp4", generated: true, kind: "video", startFrom: 50, speed: 2, durationInFrames: 24, punch: false },
  take("b02y-normaal",    "10-6E8A6380.mp4",  18.72, 1.16, "53% 50%"),
  { ...take("b04-enthousiast", "06-6E8A6376.mp4", 15.40, 3.60, "35% 50%"), grade: ELITE_GRADE.indoor },
  // Back in, with the slap: from "glasramen zijn" to "glazen ramen", ending
  // before "ik weet niet".
  take("b05-glasramen",   "19-6E8A6389.mp4",  13.96, 5.08, "65% 50%"),
  // "...naar daar kijken." - and there is a kestrel, looking back at him.
  take("b06-kijken",      "10-6E8A6380.mp4",  56.40, 1.68, "65% 50%"),
  // Kling: a kestrel (torenvalk) hangs in an empty sky, looks down at him
  // and calls (0.88-2.88s holds all three calls, measured -22.6 LUFS). Its own sound, so at normal speed to keep the sound on it.
  { id: "c02-bird", file: "kestrel.mp4", generated: true, kind: "video", startFrom: 22, durationInFrames: 50, punch: false },
  take("b06b-mij",        "10-6E8A6380.mp4",  58.24, 1.04, "65% 50%"),
  take("b07-bloopers",    "07-6E8A6377.mp4", 111.12, 1.68, "65% 50%"),
  // Just "De bloopers.", said once.
  take("b07a-de",         "07-6E8A6377.mp4", 113.88, 1.00, "65% 50%"),
  // The punchline: Tino at the window, doing it properly, under the two
  // lines of text (see pops).
  { id: "b08-proper", ...S.reflect, kind: "video", durationInFrames: 85, focus: MOBILE_FOCUS.reflect, punch: false },
]));

const SUBTITLES_ELITE_BLOOPERS: Subtitle[] = [
  { from: 1,   to: 29,  text: "Hij is aan het opnemen!" },
  { from: 29,  to: 111, text: "Wilt u, als B2B-bedrijf, meer..." },
  { from: 112, to: 126, text: "Error." },
  { from: 151, to: 179, text: "Dat geeft niet. Dat is normaal." },
  { from: 180, to: 211, text: "Oh, ik had dat niet gezien." },
  { from: 213, to: 269, text: "We moeten wel een beetje enthousiast zijn." },
  { from: 269, to: 305, text: "...glasramen zijn." },
  { from: 319, to: 347, text: "Zijn dat geen glasramen?" },
  { from: 349, to: 396, text: "Ja, glaspartij of glazen ramen." },
  { from: 397, to: 438, text: "Oké, maar ik moet naar daar kijken." },
  { from: 489, to: 514, text: "Nee, naar mij kijken." },
  { from: 516, to: 556, text: "Wilt u, als B2..." },
  { from: 556, to: 581, text: "De bloopers!" },
];

/**
 * Tino speaking: a question from behind the camera, his answer, his pitch.
 * 18.2s and the logo. He answers on camera and the end of the answer runs
 * on over him at the glass; the question to businesses plays over the van
 * and he says the last line into the lens. All of it his own sound.
 *
 *    0  "Hey Tino, hoe vaak moet je zo'n ramen wassen?"   on camera
 *       "Hier om de zes weken." "En waarom?" "Omdat er hier veel
 *       passage is van klanten
 *  200  en er toch wel regelmatig vingerafdrukken op de ramen zijn."
 *                                                         at the window, the glass
 *  267  "Wilt u, als B2B-bedrijf, meer zichtbaarheid?"     the van, the ladder
 *  349  "Dan is een propere ingang een visitekaartje van uw bedrijf."
 *                                                         on camera
 */
export const SHOTS_ELITE_TINO: Shot[] = graded(inProject("elite", [
  // Framed to keep the hotel's banner, just left of him, out of the slice.
  take("t01-vraag", "16-6E8A6386.mp4", 1.60, 8.00, "74% 50%"),
  { id: "t02-reflect", ...S.reflect,   kind: "video", durationInFrames: 34, focus: MOBILE_FOCUS.reflect,   punch: false },
  { id: "t03-glass",   ...S.glass,     kind: "video", durationInFrames: 33, focus: MOBILE_FOCUS.glass,     punch: false },
  { id: "t04-out",     ...S.out,       kind: "video", durationInFrames: 41, focus: MOBILE_FOCUS.out,       punch: false },
  { id: "t05-ladder",  ...S.ladderOff, kind: "video", durationInFrames: 41, focus: MOBILE_FOCUS.ladderOff, punch: false },
  take("t06-ingang", "10-6E8A6380.mp4", 60.00, 4.20, "65% 50%"),
]));

const VOICE_ELITE_TINO: VoiceClip[] = [
  // 1.60-12.28s: the question, the answer, the follow-up and the reason.
  { id: "t-voice1-vraag",   file: "16-6E8A6386.mp4", project: "elite", from: 0,   startFrom: 40,   durationInFrames: 267, lufs: -21.94 },
  { id: "t-voice2-b2b",     file: "10-6E8A6380.mp4", project: "elite", from: 271, startFrom: 663,  durationInFrames: 78,  lufs: -20.81 },
  { id: "t-voice3-ingang",  file: "10-6E8A6380.mp4", project: "elite", from: 349, startFrom: 1500, durationInFrames: 99,  lufs: -21.23 },
];

const SUBTITLES_ELITE_TINO: Subtitle[] = [
  { from: 2,   to: 62,  text: "Hey Tino, hoe vaak moet je zo'n ramen wassen?" },
  { from: 76,  to: 118, text: "Hier om de zes weken." },
  { from: 126, to: 150, text: "En waarom?" },
  { from: 152, to: 198, text: "Omdat er hier veel passage is van klanten" },
  { from: 198, to: 226, text: "en er toch wel regelmatig" },
  { from: 226, to: 266, text: "vingerafdrukken op de ramen zijn." },
  { from: 272, to: 348, text: "Wilt u, als B2B-bedrijf, meer zichtbaarheid?" },
  { from: 349, to: 388, text: "Dan is een propere ingang" },
  { from: 388, to: 452, text: "een visitekaartje van uw bedrijf." },
];

/**
 * The serious advert: no talking, the best of the work with four lines of
 * copy and the offer on the logo. 17s and the logo, for Meta (which plays
 * muted). Cold-traffic copy per the brand document: short, direct, a
 * consequence, a quote. Nothing of Flanders Cobblestone in frame.
 */
export const SHOTS_ELITE_SERIOUS: Shot[] = graded(inProject("elite",
  ([
    ["vanAir", 46], ["out", 42], ["ladderOff", 32], ["glass", 38], ["reflect", 44], ["room", 36],
    ["roof", 34], ["solar", 36], ["solarAir", 32], ["van", 24], ["atVan", 28], ["vanRear", 34],
  ] as Array<[keyof typeof S, number]>).map(([key, frames], i) => ({
    id: `p${String(i + 1).padStart(2, "0")}-${key.toLowerCase()}`,
    ...S[key],
    kind: "video" as const,
    durationInFrames: frames,
    focus: MOBILE_FOCUS[key],
    move: "push" as const,
    punch: false,
  })),
));

/**
 * Tino to camera, for Meta and Instagram: the presentable version, with
 * none of the cameraman's questions. It makes the case for a business: be
 * seen; a clean entrance is your business card; the windows want doing
 * every six weeks; he checks the work himself; it is clean. 13.4s and the
 * offer on the logo.
 *
 * Michael's notes on the earlier cuts: open on Tino looking into the lens
 * (the only complete take of him asking the question has him looking up at
 * the drone), and never a silence or a silent Tino while his voice plays.
 * So the first frame is his clearest line, said into the lens, with the
 * question it answers on screen above the subtitles; the voice-over runs
 * only over shots where his face is not the subject (the ladder from
 * behind, the roof).
 *
 *  frame  picture                          sound
 *      0  Tino, into the lens              "Dan is een propere ingang een visitekaartje
 *         (title: Wil je als bedrijf         van uw bedrijf."
 *          meer zichtbaarheid?)
 *    102  the ladder off the van, the roof "In dit geval is het toch aangewezen om de zes
 *                                           weken de ramen te doen."  (take 12, cut after "maar")
 *    183  at the window, inside            "Ik ben nu de kwaliteit aan het controleren,
 *                                           dat we toch proper alles achterlaten."
 *    277  clean panels, a beat
 *    293  Tino                             "Het is proper!"
 *    336  logo: Vraag je gratis offerte
 */
export const SHOTS_ELITE_AD_TINO: Shot[] = graded(inProject("elite", [
  take("e01-ingang", "10-6E8A6380.mp4", 60.00, 4.08, "65% 50%"),
  { id: "e02-ladder",  ...S.ladderOff, kind: "video", durationInFrames: 40, focus: MOBILE_FOCUS.ladderOff, punch: false },
  { id: "e03-roof",    ...S.roof,      kind: "video", durationInFrames: 41, focus: MOBILE_FOCUS.roof,      punch: false },
  { ...take("e04-kwaliteit", "03-6E8A6373.mp4", 15.04, 3.76, "57% 50%"), grade: ELITE_GRADE.indoor },
  { id: "e05-solar",   ...S.solar,     kind: "video", durationInFrames: 16, focus: MOBILE_FOCUS.solar,     punch: false },
  { ...take("e06-proper", "03-6E8A6373.mp4", 21.08, 1.72, "57% 50%"), grade: ELITE_GRADE.indoor },
]));

const VOICE_ELITE_AD_TINO: VoiceClip[] = [
  // In sync with e01, from its first frame.
  { id: "e-voice2-ingang",    file: "10-6E8A6380.mp4", project: "elite", from: 0,   startFrom: 1500, durationInFrames: 99, lufs: -21.23 },
  // 20.48-23.64s: starts in the dip after "maar", so it stands alone.
  { id: "e-voice3-advies",    file: "12-6E8A6382.mp4", project: "elite", from: 104, startFrom: 512,  durationInFrames: 79, lufs: -22.84 },
  // In sync with e04 (376 + 1 frame at 184).
  { id: "e-voice4-kwaliteit", file: "03-6E8A6373.mp4", project: "elite", from: 184, startFrom: 377,  durationInFrames: 93, lufs: -24.2 },
  { id: "e-voice5-proper",    file: "03-6E8A6373.mp4", project: "elite", from: 293, startFrom: 527,  durationInFrames: 43, lufs: -13.55 },
];

const SUBTITLES_ELITE_AD_TINO: Subtitle[] = [
  { from: 0,   to: 39,  text: "Dan is een propere ingang" },
  { from: 39,  to: 101, text: "een visitekaartje van uw bedrijf." },
  { from: 104, to: 146, text: "In dit geval is het toch aangewezen" },
  { from: 146, to: 183, text: "om de zes weken de ramen te doen." },
  { from: 184, to: 243, text: "Ik ben nu de kwaliteit aan het controleren," },
  { from: 243, to: 277, text: "dat we toch proper alles achterlaten." },
  { from: 294, to: 336, text: "Het is proper!" },
];

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

FILMS["elite-header-vertical"] = {
  id: "elite-header-vertical",
  label: "Elite Cleaning - mobile website header (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_MOBILE,
  energy: "fast",
  captions: {},
  endCard: null,
  plain: true,
  loopFade: 8,
  targetFrames: HEADER_FRAMES,
};

FILMS["elite-header-vertical-generic"] = {
  id: "elite-header-vertical-generic",
  label: "Elite Cleaning - mobile website header, generic (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_GENERIC,
  energy: "fast",
  captions: {},
  endCard: null,
  plain: true,
  loopFade: 8,
  targetFrames: HEADER_FRAMES,
};

FILMS["elite-bloopers"] = {
  id: "elite-bloopers",
  label: "Elite Cleaning - bloopers (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_BLOOPERS,
  // Hard cuts: a blooper lands on the cut.
  energy: "fast",
  captions: {},
  voice: ownSound(SHOTS_ELITE_BLOOPERS, {
    "b01-opnemen": -18.73, "b02-error": -20.75, "b02z-error": -20.75, "b04-enthousiast": -17.9,
    "b02y-normaal": -20.75, "c02-bird": -22.6, "b05-glasramen": -22.86, "b06-kijken": -21.59, "b06b-mij": -21.59,
    "b07-bloopers": -20.97, "b07a-de": -20.97,
  }),
  subtitles: SUBTITLES_ELITE_BLOOPERS,
  pops: [
    { from: 0,   to: 34,  text: "BLOOPERS", flash: true, y: 0.4, size: 0.16 },
    // Word by word, on the beat: a statement, then the answer.
    { from: 581, to: 666, text: "We kunnen niet top zijn in alles.", beat: 5, edge: ELITE.navy,
      y: 0.3, size: 0.08, band: [0.26, 0.3] },
    { from: 619, to: 666, text: "Maar in schoonmaken zijn we de beste.", beat: 5, y: 0.42, size: 0.08 },
  ],
  font: ELITE_FONT,
  plain: true,
  endCard: ELITE_END_CARD,
  // 23.2s of takes and cutaways, 3.4s of punchline, 1.8s of logo.
  targetFrames: 666 + 45,
};

FILMS["elite-tino-speaking"] = {
  id: "elite-tino-speaking",
  label: "Elite Cleaning - Tino speaking (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_TINO,
  energy: "high",
  captions: {},
  voice: VOICE_ELITE_TINO,
  subtitles: SUBTITLES_ELITE_TINO,
  font: ELITE_FONT,
  plain: true,
  endCard: ELITE_END_CARD,
  // 18.2s of Tino + 1.8s of logo.
  targetFrames: 454 + 45,
};

FILMS["elite-ad-serious"] = {
  id: "elite-ad-serious",
  label: "Elite Cleaning - advert, serious (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_SERIOUS,
  // 6-frame dissolves and a slow push on every shot: considered, not hectic.
  energy: "high",
  captions: {},
  titles: [
    { from: 4,   to: 116, text: "Ramen, zonnepanelen, dak en gevel.", sub: "Elite Cleaning, Geraardsbergen" },
    { from: 124, to: 234, text: "Zo proper dat het opvalt." },
    { from: 242, to: 336, text: "Vuile panelen kosten je rendement." },
    { from: 344, to: 424, text: "Honderden klanten gingen je voor." },
  ],
  font: ELITE_FONT,
  plain: true,
  // The offer on the logo card: the site's own call to action.
  endCard: { ...ELITE_END_CARD, line: "Vraag je gratis offerte" },
  // 17s of footage + 1.8s of logo.
  targetFrames: 426 + 45,
};

FILMS["elite-ad-tino"] = {
  id: "elite-ad-tino",
  label: "Elite Cleaning - advert, Tino to camera (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_AD_TINO,
  energy: "high",
  captions: {},
  voice: VOICE_ELITE_AD_TINO,
  subtitles: SUBTITLES_ELITE_AD_TINO,
  // Brand copy, so je/jij; Tino's own words keep his "u".
  titles: [{ from: 0, to: 100, text: "Wil je als bedrijf meer zichtbaarheid?", aboveSubtitles: true }],
  font: ELITE_FONT,
  plain: true,
  endCard: { ...ELITE_END_CARD, line: "Vraag je gratis offerte" },
  // 13.4s of Tino + 1.8s of logo: under the 20s Michael set for Meta.
  targetFrames: 336 + 45,
};

FILMS["elite-ad"] = {
  id: "elite-ad",
  label: "Elite Cleaning - advert (9:16)",
  format: "vertical",
  shots: SHOTS_ELITE_AD,
  // 6-frame dissolves: soft enough under a voice, still a cut.
  energy: "high",
  captions: {},
  voice: VOICE_ELITE_AD,
  subtitles: SUBTITLES_ELITE_AD,
  font: ELITE_FONT,
  // No vignette or bottom scrim: they were taking back a third of the
  // brightness the grade put in (median luma 132 graded, 98 on screen).
  // The subtitles carry their own backing, line by line.
  plain: true,
  endCard: ELITE_END_CARD,
  // 16.2s of story + 1.8s of logo (the brief was at most 18s + logo).
  targetFrames: 406 + 45,
};
