// Captured Squarespace text and images that never made it into the built site.
// Deliberate omissions live in capture/excluded.json as { "texts": [{text, reason}], "images": [{path, reason}] }.
// CLI: node scripts/check-content.mjs  (exits 1 and lists what is missing)
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import { walk } from "./site-files.mjs";

export const normalize = (s) =>
  s.toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...")
    .replace(/\s+/g, " ").trim();

const excluded = () =>
  existsSync("capture/excluded.json") ? JSON.parse(readFileSync("capture/excluded.json", "utf8")) : { texts: [], images: [] };

/** Returns ["text: <first 60 chars>", "image: <path>", ...] for captured content absent from the build. */
export function findMissingContent(siteDir, manifest) {
  const pages = walk(siteDir).filter((p) => p.endsWith(".html")).map((p) => readFileSync(p, "utf8"));
  const siteText = normalize(pages.map((h) => cheerio.load(h).root().text()).join(" \n "));
  const siteHtml = pages.join("\n");
  const skip = excluded();
  const skipTexts = new Set(skip.texts.map((t) => normalize(t.text)));
  const skipImages = new Set(skip.images.map((i) => i.path));

  const missing = [];
  const texts = new Set(Object.values(manifest.pages).flatMap((p) => p.texts).map(normalize));
  for (const t of texts) {
    if (!skipTexts.has(t) && !siteText.includes(t)) missing.push(`text: ${t.slice(0, 60)}`);
  }
  for (const path of new Set(Object.values(manifest.images))) {
    if (!skipImages.has(path) && !siteHtml.includes(path)) missing.push(`image: ${path}`);
  }
  return missing;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync("capture/manifest.json", "utf8"));
  const missing = findMissingContent("_site", manifest);
  missing.forEach((m) => console.log(m));
  process.exit(missing.length ? 1 : 0);
}
