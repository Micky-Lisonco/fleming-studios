import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Elite Cleaning's typeface, Nunito, from files in public/fonts (SIL Open
 * Font License, NUNITO-OFL.txt beside them).
 *
 * Local on purpose. Fetching it from Google at render time made every
 * render - Cobblestone films included - depend on fonts.gstatic.com being
 * reachable, and a failed fetch failed the whole render. Here a render
 * waits for the three weights, and if they cannot load it carries on in
 * the fallback font rather than stopping.
 */
const FACES: Array<[weight: string, file: string]> = [
  ["400", "nunito-latin-400-normal.woff2"],
  ["700", "nunito-latin-700-normal.woff2"],
  ["800", "nunito-latin-800-normal.woff2"],
];

if (typeof document !== "undefined" && typeof FontFace !== "undefined") {
  const handle = delayRender("Loading Nunito");
  Promise.all(
    FACES.map(([weight, file]) =>
      new FontFace("Nunito", `url(${staticFile(`fonts/${file}`)}) format("woff2")`, {
        weight,
        style: "normal",
      })
        .load()
        .then((face) => document.fonts.add(face))
    )
  )
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("Nunito did not load; using the fallback font.", err);
    })
    .finally(() => continueRender(handle));
}
