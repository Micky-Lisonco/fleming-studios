/**
 * Renders a film without any of Remotion's native binaries.
 *
 *   npm run video:render:safe -- brand-wide
 *   npm run video:render:safe -- ad-explainer-nl
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
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const id = process.argv[2] ?? "brand-wide";
const frames = join("out", "frames", id);
const output = join("out", `${id}.mp4`);
const win = process.platform === "win32";

const run = (cmd, args, env = {}) => {
  process.stdout.write(`\n> ${cmd} ${args.join(" ")}\n`);
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: win,
    env: { ...process.env, ...env },
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    process.stderr.write(`\nFailed at: ${cmd} (exit ${r.status})\n`);
    process.exit(r.status ?? 1);
  }
};

const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { shell: win });
if (ffmpegCheck.status !== 0) {
  process.stderr.write("ffmpeg is not on PATH. It is the same ffmpeg analyse-footage.ps1 uses.\n");
  process.exit(1);
}

rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

run(
  "npx",
  [
    "remotion", "render", "remotion/index.ts", id, frames,
    "--sequence", "--muted", "--image-format=jpeg", "--jpeg-quality=95",
    "--image-sequence-pattern=frame-[frame].[ext]", "--concurrency=1",
  ],
  { REMOTION_BROWSER_VIDEO: "1" },
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
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart",
  output,
]);

rmSync(frames, { recursive: true, force: true });
process.stdout.write(`\nDone: ${output}\n`);
