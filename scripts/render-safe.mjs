/**
 * Renders a film without any of Remotion's native binaries.
 *
 *   npm run video:render:safe -- brand-wide              draft, from proxies
 *   npm run video:render:safe -- brand-wide --final      delivery, from 4K
 *   npm run video:render:safe -- brand-wide --final --4k 3840x2160 output
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
 * Silent output: the films have no music yet and every shot is muted.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const id = argv.find((a) => !a.startsWith("--")) ?? "brand-wide";
const final = argv.includes("--final");
const uhd = argv.includes("--4k");
const frames = join("out", "frames", id);
const output = join("out", `${id}${final ? "" : "-draft"}${uhd ? "-4k" : ""}.mp4`);
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
  const where = (s) => join("public", ...(s.project ? [s.project] : []), "media", `${s.id}.mp4`);
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

run("ffmpeg", [
  "-y", "-loglevel", "error", "-framerate", "25",
  "-i", join(frames, `frame-%0${digits}d.${ext}`),
  // Chrome's JPEG frames are full-range BT.601. Left as they are, the
  // MP4 comes out flagged full-range (yuvj420p), and players and ad
  // platforms that assume normal range show it washed out or crushed.
  // Convert to what every screen expects: BT.709, limited range.
  //
  // Via RGB on purpose. A direct YUV-to-YUV matrix change (bt601 full to
  // bt709 limited) measured 3-4 levels dark and slightly cyan on neutral
  // grey test patches; going through rgb24 lands greys exactly and
  // colours within 2 levels.
  "-vf", "format=rgb24,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
  // Tagged in the H.264 stream itself: -color_primaries and friends lose
  // to per-frame metadata in ffmpeg 7, and this works in any build.
  "-c:v", "libx264", "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
  // Delivery: lower CRF and a slower preset spend bits on detail - the
  // cobbles and the brushed steel are exactly what a fast encode smears.
  "-crf", final ? "16" : "18", "-preset", final ? "slow" : "medium",
  "-movflags", "+faststart",
  output,
]);

rmSync(frames, { recursive: true, force: true });
process.stdout.write(`\nDone: ${output}\n`);
