/**
 * Writes out/cut.json: every piece of master footage the films use, one
 * file per client project - out/cut.json for Normocare (no project) and
 * out/<project>/cut.json for the rest, which is where conform.ps1
 * -Project <name> looks.
 *
 *   npm run cut:export
 *
 * Derived from edit.ts rather than maintained by hand, so the conform
 * cannot fall out of step with the cut. Shot ids are unique across the
 * films, so the same source clip used at two different moments becomes
 * two conformed files, each trimmed to its own moment.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { FILMS, FPS, filmFrames } from "../remotion/edit.ts";

const shots = [];
// brand-wide and brand-wide-titled share a shot list, so the same shot id
// turns up twice. Conform writes one file per id, so the second copy is
// pure waste - fourteen 4K clips encoded twice. Keep the first, and stop
// if two films ever give one id different footage, because one of them
// would silently render the other's picture.
const byId = new Map();
for (const film of Object.values(FILMS)) {
  for (const shot of film.shots) {
    if (!shot.file) continue;
    // Stills are already final and have no master to trim from.
    if (shot.kind === "image") continue;
    const speed = shot.speed ?? 1;
    const key = JSON.stringify([shot.file, shot.startFrom ?? 0, shot.durationInFrames, speed]);
    const key2 = `${shot.project ?? ""}/${shot.id}`;
    if (byId.has(key2)) {
      if (byId.get(key2) !== key) {
        throw new Error(`Shot id "${shot.id}" is used for two different pieces of footage. Rename one.`);
      }
      continue;
    }
    byId.set(key2, key);
    shots.push({
      id: shot.id,
      project: shot.project ?? null,
      film: film.id,
      file: shot.file,
      startSec: +((shot.startFrom ?? 0) / FPS).toFixed(3),
      durationSec: +(shot.durationInFrames / FPS).toFixed(3),
      // What the shot consumes from the master. A drone shot at 1.15x
      // plays 15% more source than its length on the timeline, and
      // conform has to cut that much or the clip runs out before the
      // shot ends.
      sourceSec: +((shot.durationInFrames * speed) / FPS).toFixed(3),
      durationInFrames: shot.durationInFrames,
      audible: Boolean(shot.audible),
    });
  }
}

const missing = Object.values(FILMS).flatMap((f) =>
  f.shots.filter((s) => !s.file).map((s) => `${f.id}/${s.id}`)
);

const projects = [...new Set(shots.map((s) => s.project))];
if (!projects.includes(null)) projects.unshift(null);
for (const project of projects) {
  const dir = project ? `out/${project}` : "out";
  const mine = shots.filter((s) => s.project === project);
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/cut.json`, JSON.stringify({ fps: FPS, project, shots: mine }, null, 2));
  const seconds = mine.reduce((n, s) => n + s.durationSec, 0);
  console.log(`Wrote ${dir}/cut.json — ${mine.length} shots, ${seconds.toFixed(1)}s of footage.`);
}
for (const film of Object.values(FILMS)) {
  console.log(`  ${film.id.padEnd(12)} ${(filmFrames(film) / FPS).toFixed(2)}s`);
}
if (missing.length) {
  console.log(`Still unassigned: ${missing.join(", ")}`);
}
