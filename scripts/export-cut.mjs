/**
 * Writes out/cut.json: what the locked edit actually uses from the
 * masters. That is the shopping list conform.ps1 works from.
 *
 *   npm run cut:export
 *
 * Deliberately derived from edit.ts rather than maintained by hand, so
 * the conform can never fall out of step with the cut.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { SHOTS, FPS, TOTAL_FRAMES } from "../remotion/edit.ts";

const used = SHOTS.filter((s) => s.file).map((s) => ({
  id: s.id,
  file: s.file,
  // Seconds, because that is what ffmpeg wants.
  startSec: +((s.startFrom ?? 0) / FPS).toFixed(3),
  durationSec: +(s.durationInFrames / FPS).toFixed(3),
  durationInFrames: s.durationInFrames,
  audible: Boolean(s.audible),
}));

const missing = SHOTS.filter((s) => !s.file).map((s) => s.id);

mkdirSync("out", { recursive: true });
writeFileSync(
  "out/cut.json",
  JSON.stringify({ fps: FPS, totalFrames: TOTAL_FRAMES, shots: used }, null, 2)
);

const seconds = used.reduce((n, s) => n + s.durationSec, 0);
console.log(`Wrote out/cut.json — ${used.length} shots, ${seconds.toFixed(1)}s of footage.`);
if (missing.length) {
  console.log(`Still unassigned (${missing.length}): ${missing.join(", ")}`);
}
