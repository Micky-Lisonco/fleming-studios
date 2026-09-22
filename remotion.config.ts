import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// H.264 in an MP4 — what Meta, TikTok and YouTube Shorts all want.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
// Visually lossless for a 20-second social cut; lower number = better quality.
Config.setCrf(18);

// Concurrency is the usual cause of the compositor dying with an access
// violation (exit code 3221225477) on Windows: every worker holds its own
// decoder, and source frames are large. Lower it rather than chasing the
// crash.
//
// This used to be opt-in through the env var, which meant the safe path
// existed only for whoever remembered to set it. The Studio's own Render
// button cannot set it at all - it inherits the environment `npm run
// video` was started in - so the one route a person actually clicks was
// the one route with no protection, and it crashed. Safe by default now;
// the env var raises it on a machine that can take it.
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 1));

// The compositor holds decoded frames in memory, and an access violation
// is what running out of it looks like from the outside. Capping the
// cache costs some re-decoding and buys headroom.
Config.setOffthreadVideoCacheSizeInBytes(512 * 1024 * 1024);

// At concurrency 1 a heavy frame has no neighbours to hide behind, and
// the 30s default starts to look tight. Nothing renders slower for this
// being generous; a render that dies at 30s does cost a whole run.
Config.setDelayRenderTimeoutInMilliseconds(120_000);

// On machines that already have a Chromium (CI, this cloud sandbox), point
// Remotion at it instead of downloading a second copy.
const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
if (browser) {
  Config.setBrowserExecutable(browser);
}
