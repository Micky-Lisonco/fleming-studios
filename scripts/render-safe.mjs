/**
 * Renders a film without any of Remotion's native binaries.
 *
 *   npm run video:render:safe -- brand-wide              draft, from proxies
 *   npm run video:render:safe -- brand-wide --final      delivery, from 4K
 *   npm run video:render:safe -- brand-wide --final --4k 3840x2160 output
 *   npm run video:render:safe -- elite-header-wide --final --web
 *   npm run video:render:safe -- elite-ad --final        with its voice track
 *
 * --web is for website header backgrounds: a file that starts
 * playing fast (1920x1080 wide, 720x1280 vertical - phones do not need
 * more behind a headline), plus <film>-poster.jpg for the <video poster>
 * attribute, taken just after the fade-in rather than from the black
 * first frame.
 *
 * Without --final it renders from public/media-proxy: small, soft,
 * low-bitrate copies that exist to keep editing fast. That is a draft and
 * looks like one - blocky on anything with fine detail, like cobbles.
 * --final renders from public/media, the clips conform.ps1 cut out of
 * the 4K masters. --4k doubles the output size; the default 1080p output
 * is already sharp, because it is downscaled from 4K.
 *
 * Why this exists: on the Windows edit machine, Remotion's bundled
 * compositor.exe and ffprobe.exe crash with an access violation
 * (exit code 3221225477) - at concurrency 1, on frame 0, while probing
 * one small proxy file. Nothing in the edit can fix a crashing binary,
 * so this route does not use them:
 *
 *   1. Chrome decodes the footage (REMOTION_BROWSER_VIDEO=1 swaps
 *      OffthreadVideo for the browser's own <Video>).
 *   2. Remotion writes JPEG frames only (--sequence), no encoding.
 *   3. The system ffmpeg - the one the analysis scripts already use -
 *      turns the frames into an MP4.
 *
 * Sound: Remotion renders muted (its audio path is the same crashing
 * binary), so a film with a voice track gets it mixed in by ffmpeg here,
 * from the same ranges edit.ts lays out - the conformed, levelled .m4a
 * clips with --final, the proxies' own audio otherwise. Films without a
 * voice track come out silent.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { FILMS, FPS, VOICE_LUFS } from "../remotion/edit.ts";

const argv = process.argv.slice(2);
const id = argv.find((a) => !a.startsWith("--")) ?? "brand-wide";
const final = argv.includes("--final");
const web = argv.includes("--web");
const uhd = argv.includes("--4k") && !web;
if (web && argv.includes("--4k")) {
  process.stdout.write("--web ignores --4k: a header background has to load fast.\n");
}
const frames = join("out", "frames", id);
// Same folder the picture comes from: the conformed clips with --final,
// otherwise whatever REMOTION_MEDIA_DIR points at, the proxies by default.
const mediaDir = final ? "media" : process.env.REMOTION_MEDIA_DIR || "media-proxy";
const voice = FILMS[id]?.voice ?? [];
const conformedVoice = mediaDir === "media";
// A conformed clip is cut and levelled already; otherwise it is the whole
// source, sought into and levelled at mix time.
const voiceSource = (v) =>
  join("public", ...(v.project ? [v.project] : []), mediaDir, conformedVoice ? `${v.id}.m4a` : v.file);
const output = join("out", `${id}${final ? "" : "-draft"}${uhd ? "-4k" : ""}${web ? "-web" : ""}.mp4`);
const win = process.platform === "win32";

// npx is a .cmd on Windows and only runs through a shell; ffmpeg is a
// real executable and does not need one. Handing a shell an argument
// array is what Node deprecates (DEP0190), so the shell gets one quoted
// string instead.
const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const run = (cmd, args, env = {}, { shell = false } = {}) => {
  const line = [cmd, ...args].map(quote).join(" ");
  process.stdout.write(`\n> ${line}\n`);
  const opts = { stdio: "inherit", env: { ...process.env, ...env } };
  const r = shell ? spawnSync(line, { ...opts, shell: true }) : spawnSync(cmd, args, opts);
  if (r.error) throw r.error;
  if (r.status !== 0) {
    process.stderr.write(`\nFailed at: ${cmd} (exit ${r.status})\n`);
    process.exit(r.status ?? 1);
  }
};

const ffmpegCheck = spawnSync("ffmpeg", ["-version"]);
if (ffmpegCheck.status !== 0) {
  process.stderr.write("ffmpeg is not on PATH. It is the same ffmpeg analyse-footage.ps1 uses.\n");
  process.exit(1);
}

// A final render that quietly falls back to a placeholder, or dies on
// shot 11 after twenty minutes, is worse than one that refuses to start.
// Check every conformed clip this film needs is on disk first.
if (final) {
  // One cut.json per client project: out/cut.json, out/<project>/cut.json.
  const cutPaths = [join("out", "cut.json")];
  if (existsSync("out")) {
    for (const d of readdirSync("out", { withFileTypes: true })) {
      if (d.isDirectory() && existsSync(join("out", d.name, "cut.json"))) {
        cutPaths.push(join("out", d.name, "cut.json"));
      }
    }
  }
  if (!existsSync(cutPaths[0]) && cutPaths.length === 1) {
    process.stderr.write("No out/cut.json. Run: npm run cut:export, then conform.ps1.\n");
    process.exit(1);
  }
  const film = id.replace(/-titled$/, "");
  const shots = cutPaths
    .filter((p) => existsSync(p))
    .flatMap((p) => JSON.parse(readFileSync(p, "utf8")).shots)
    .filter((s) => s.film === id || s.film === film);
  const needed = shots.map((s) => s.id);
  const where = (s) =>
    join("public", ...(s.project ? [s.project] : []), "media", `${s.id}.${s.audioOnly ? "m4a" : "mp4"}`);
  const missing = shots.filter((s) => !existsSync(where(s))).map((s) => where(s));
  if (needed.length === 0) {
    process.stderr.write(`out/cut.json has no shots for ${id}. Run: npm run cut:export\n`);
    process.exit(1);
  }
  if (missing.length) {
    process.stderr.write(
      `Not conformed yet (${missing.length} of ${needed.length}) - run conform.ps1` +
        `${shots[0]?.project ? ` -Project ${shots[0].project}` : ""} first:\n  ${missing.join("\n  ")}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`All ${needed.length} conformed clips found.\n`);
}

// Checked before rendering, not after twenty minutes of frames.
const noVoice = voice.map(voiceSource).filter((p) => !existsSync(p));
if (noVoice.length) {
  process.stderr.write(`Voice clips not found:\n  ${noVoice.join("\n  ")}\n`);
  process.exit(1);
}

rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

run(
  "npx",
  [
    "remotion", "render", "remotion/index.ts", id, frames,
    "--sequence", "--muted", "--image-format=jpeg",
    // The frames are an intermediate: every bit of loss here is baked in
    // before the real encode. 100 for delivery, 95 is plenty for a draft.
    `--jpeg-quality=${final ? 100 : 95}`,
    "--image-sequence-pattern=frame-[frame].[ext]", "--concurrency=1",
    ...(uhd ? ["--scale=2"] : []),
  ],
  { REMOTION_BROWSER_VIDEO: "1", ...(final ? { REMOTION_MEDIA_DIR: "media" } : {}) },
  { shell: win },
);

const first = readdirSync(frames).filter((f) => f.startsWith("frame-")).sort()[0];
if (!first) {
  process.stderr.write("No frames were written.\n");
  process.exit(1);
}
const digits = first.replace(/^frame-/, "").replace(/\.jpe?g$/, "").length;
const ext = first.split(".").pop();

// Frame size, read from the JPEG itself (the SOF marker) so the script
// needs nothing beyond Node to know whether the film is vertical.
const jpegSize = (path) => {
  const b = readFileSync(path);
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return { w: 1, h: 0 };
};
const size = jpegSize(join(frames, first));
const vertical = size.h > size.w;
const count = readdirSync(frames).filter((f) => f.startsWith("frame-")).length;

// The voice track, one ffmpeg input per clip, each placed at its frame on
// the timeline. A source that is not conformed is levelled here to the
// same loudness conform delivers.
const ceiling = 10 ** (-1.4 / 20);
const audioInputs = [];
const audioChains = [];
voice.forEach((v, i) => {
  const dur = v.durationInFrames / FPS;
  audioInputs.push(
    ...(conformedVoice ? [] : ["-ss", (v.startFrom / FPS).toFixed(3), "-t", dur.toFixed(3)]),
    "-i", voiceSource(v),
  );
  const level = conformedVoice
    ? []
    : [`volume=${(VOICE_LUFS - v.lufs).toFixed(2)}dB`, `alimiter=limit=${ceiling.toFixed(4)}:level=false`];
  audioChains.push(
    `[${i + 1}:a]` +
      [
        "aformat=sample_rates=48000:channel_layouts=stereo",
        ...level,
        `atrim=0:${dur.toFixed(3)}`,
        "asetpts=PTS-STARTPTS",
        // A few milliseconds each end, so a cut mid-breath does not click.
        "afade=t=in:d=0.02",
        // A quarter of the clip at most: a stuttered syllable is 0.16s.
        `afade=t=out:st=${Math.max(0, dur - Math.min(0.08, dur / 4)).toFixed(3)}:d=${Math.min(0.08, dur / 4).toFixed(3)}`,
        `adelay=delays=${Math.round((v.from / FPS) * 1000)}:all=1`,
      ].join(",") +
      `[v${i}]`,
  );
});
const audio = voice.length
  ? [
      "-filter_complex",
      audioChains.join(";") + ";" +
        voice.map((_, i) => `[v${i}]`).join("") +
        `amix=inputs=${voice.length}:normalize=0:dropout_transition=0,` +
        `apad=whole_dur=${(count / FPS).toFixed(3)}[voice]`,
      "-map", "0:v", "-map", "[voice]",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    ]
  : [];
if (voice.length) process.stdout.write(`\nVoice track: ${voice.length} clips from ${mediaDir}.\n`);

run("ffmpeg", [
  "-y", "-loglevel", "error", "-framerate", "25",
  "-i", join(frames, `frame-%0${digits}d.${ext}`),
  ...audioInputs,
  // Chrome's JPEG frames are full-range BT.601. Left as they are, the
  // MP4 comes out flagged full-range (yuvj420p), and players and ad
  // platforms that assume normal range show it washed out or crushed.
  // Convert to what every screen expects: BT.709, limited range.
  //
  // Via RGB on purpose. A direct YUV-to-YUV matrix change (bt601 full to
  // bt709 limited) measured 3-4 levels dark and slightly cyan on neutral
  // grey test patches; going through rgb24 lands greys exactly and
  // colours within 2 levels.
  "-vf",
  "format=rgb24," +
    // Vertical web files come down to 720 wide; everything else keeps
    // its rendered size.
    (web && vertical ? "scale=w=720:h=-2:flags=lanczos:" : "scale=") +
    "out_color_matrix=bt709:out_range=tv,format=yuv420p",
  // Tagged in the H.264 stream itself: -color_primaries and friends lose
  // to per-frame metadata in ffmpeg 7, and this works in any build.
  "-c:v", "libx264", "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
  // Delivery: lower CRF and a slower preset spend bits on detail - the
  // cobbles and the brushed steel are exactly what a fast encode smears.
  // Web: CRF 17, visually lossless. A lower setting (26 here before) and
  // a header behind a dark page overlay break into blocks in the shadows
  // and on anything moving - the website agent measured exactly that on a
  // 5 Mbps hero. High profile plays on every current browser.
  ...(web ? ["-profile:v", "high"] : []),
  "-crf", web ? "17" : final ? "16" : "18", "-preset", final || web ? "slow" : "medium",
  "-movflags", "+faststart",
  ...audio,
  output,
]);

if (web) {
  // Poster: the first frame of a looping header is black (loop fade), so
  // take one a second in.
  const all = readdirSync(frames).filter((f) => f.startsWith("frame-")).sort();
  const pick = all[Math.min(all.length - 1, 25)];
  const poster = join("out", `${id}${final ? "" : "-draft"}-poster.jpg`);
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", join(frames, pick),
    ...(vertical ? ["-vf", "scale=720:-2:flags=lanczos"] : []),
    "-q:v", "3", poster,
  ]);
  process.stdout.write(`Poster: ${poster}\n`);
}

rmSync(frames, { recursive: true, force: true });
const mb = (statSync(output).size / 1e6).toFixed(1);
process.stdout.write(`\nDone: ${output} (${mb} MB)\n`);
