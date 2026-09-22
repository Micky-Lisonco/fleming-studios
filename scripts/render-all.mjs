/**
 * Renders every campaign in both formats, one after another.
 *
 *   npm run video:render:all
 *   REMOTION_MEDIA_DIR=media npm run video:render:all   # final, from masters
 *
 * Serial on purpose: Remotion already saturates the cores on a single
 * render, so running them in parallel makes the whole batch slower.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const VARIANTS = ["sporter-nl", "particulier-nl", "sporter-en"];
const FORMATS = ["", "-wide"];

mkdirSync("out", { recursive: true });

for (const variant of VARIANTS) {
  for (const format of FORMATS) {
    const id = `${variant}${format}`;
    process.stdout.write(`\n── ${id} ──\n`);
    execFileSync(
      "npx",
      ["remotion", "render", "remotion/index.ts", id, `out/${id}.mp4`],
      { stdio: "inherit" }
    );
  }
}

process.stdout.write(`\nDone. ${VARIANTS.length * FORMATS.length} files in out/\n`);
