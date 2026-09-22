import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// H.264 in an MP4 — what Meta, TikTok and YouTube Shorts all want.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
// Visually lossless for a 20-second social cut; lower number = better quality.
Config.setCrf(18);

// On machines that already have a Chromium (CI, this cloud sandbox), point
// Remotion at it instead of downloading a second copy.
const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
if (browser) {
  Config.setBrowserExecutable(browser);
}
