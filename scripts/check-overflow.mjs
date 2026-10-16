// Finds pages that are wider than the viewport at narrow widths.
// CLI: node scripts/check-overflow.mjs  (exits 1 and lists offenders)
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };

async function htmlPages(dir, root = dir) {
  const out = [];
  for (const f of await readdir(dir)) {
    const p = join(dir, f);
    if ((await stat(p)).isDirectory()) out.push(...(await htmlPages(p, root)));
    // Redirect stubs navigate away at once and have no layout of their own.
    else if (f.endsWith(".html") && !(await readFile(p, "utf8")).includes('http-equiv="refresh"')) out.push("/" + relative(root, p).replace(/\\/g, "/").replace(/index\.html$/, ""));
  }
  return out;
}

function serve(root) {
  const server = createServer(async (req, res) => {
    let p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    try {
      if ((await stat(p)).isDirectory()) p = join(p, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
      res.end(await readFile(p));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

/** Returns ["<path> @<width>px: <scrollWidth>px", ...] for every page wider than the viewport. */
export async function findOverflow(siteDir, widths) {
  const server = await serve(siteDir);
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const offenders = [];
  try {
    const pages = await htmlPages(siteDir);
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      // Block third-party requests; the check is about our own layout.
      await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      for (const path of pages) {
        await page.goto(base + path, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        // body has overflow-x:hidden as a safety net; lift it so real overflow shows.
        const sw = await page.evaluate(() => {
          document.body.style.overflowX = "visible";
          return document.documentElement.scrollWidth;
        });
        if (sw > width) offenders.push(`${path} @${width}px: ${sw}px`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  return offenders;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const offenders = await findOverflow("_site", [320, 375]);
  offenders.forEach((o) => console.log(o));
  process.exit(offenders.length ? 1 : 0);
}
