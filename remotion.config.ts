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
// decoder, and 4K source frames are large. Lower it rather than chasing
// the crash.
const concurrency = process.env.REMOTION_CONCURRENCY;
if (concurrency) {
  Config.setConcurrency(Number(concurrency));
}

// On machines that already have a Chromium (CI, this cloud sandbox), point
// Remotion at it instead of downloading a second copy.
const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
if (browser) {
  Config.setBrowserExecutable(browser);
}
