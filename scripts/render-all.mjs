/**
 * Renders both films, one after another.
 *
 *   npm run video:render:all
 *   REMOTION_MEDIA_DIR=media npm run video:render:all   # final, from masters
 *
 * Serial on purpose: Remotion already saturates the cores on a single
 * render, so running them in parallel makes the whole batch slower.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const FILMS = ["brand-wide", "ad-nl"];

mkdirSync("out", { recursive: true });

for (const id of FILMS) {
  process.stdout.write(`\n── ${id} ──\n`);
  execFileSync("npx", ["remotion", "render", "remotion/index.ts", id, `out/${id}.mp4`], {
    stdio: "inherit",
  });
}

process.stdout.write(`\nDone. ${FILMS.length} files in out/\n`);
