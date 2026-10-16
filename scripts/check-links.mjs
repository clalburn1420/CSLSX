// Internal links and asset references in the built site that point at nothing.
// CLI: node scripts/check-links.mjs  (exits 1 and lists offenders)
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import { walk } from "./site-files.mjs";

const isExternal = (u) => /^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(u);

function resolves(siteDir, fromFile, ref) {
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (!clean) return true;
  const target = clean.startsWith("/") ? join(siteDir, clean) : join(dirname(fromFile), clean);
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(join(target, "index.html"));
}

/** Returns ["<page> → <ref>", ...] for every unresolvable internal reference. */
export function findBrokenLinks(siteDir) {
  const broken = [];
  for (const file of walk(siteDir).filter((p) => p.endsWith(".html"))) {
    const $ = cheerio.load(readFileSync(file, "utf8"));
    const refs = [];
    $("[href], [src]").each((_, el) => refs.push($(el).attr("href") ?? $(el).attr("src")));
    $("[srcset]").each((_, el) => $(el).attr("srcset").split(",").forEach((s) => refs.push(s.trim().split(/\s+/)[0])));
    const refresh = $('meta[http-equiv="refresh"]').attr("content")?.match(/url=(.+)$/i)?.[1];
    if (refresh) refs.push(refresh);
    for (const ref of refs.filter((r) => r && !isExternal(r))) {
      if (!resolves(siteDir, file, ref)) broken.push(`${relative(siteDir, file).split("\\").join("/")} → ${ref}`);
    }
  }
  return [...new Set(broken)];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const broken = findBrokenLinks("_site");
  broken.forEach((b) => console.log(b));
  process.exit(broken.length ? 1 : 0);
}
