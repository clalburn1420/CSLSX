// One-time capture of www.cslsx.com (Squarespace) into capture/ and src/assets/.
// Re-running is safe: images and downloads already on disk are skipped.
import { mkdir, writeFile, access } from "node:fs/promises";
import * as cheerio from "cheerio";
import sharp from "sharp";
import { extractImageUrls, localImageName } from "./lib/capture-utils.mjs";

const ORIGIN = "https://www.cslsx.com";
const PAGES = ["", "releases", "releases/x310ryvv25xgpl6izwro0dy3swrxg9", "singles", "artists", "events", "videos", "news", "label"];
const IMG_DIR = "src/assets/img";
const DL_DIR = "src/assets/dl";
const RAW_DIR = "capture/raw";

const slugOf = (path) => (path.replace(/^\/|\/$/g, "") || "home").replace(/\//g, "__");
const exists = (p) => access(p).then(() => true, () => false);

async function get(url, as = "text") {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 cslsx-archive" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === "buffer" ? Buffer.from(await res.arrayBuffer()) : res.text();
}

// Paragraph-level text a visitor reads, used later to prove nothing was dropped.
function visibleTexts(html) {
  const $ = cheerio.load(html);
  const root = $("main").length ? $("main") : $("body");
  root.find("script, style, noscript, nav, header, footer").remove();
  const texts = root.find("p, h1, h2, h3, h4, blockquote, li")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((t) => t.length >= 20);
  return [...new Set(texts)];
}

async function capturePage(path) {
  const slug = slugOf(path);
  const html = await get(`${ORIGIN}/${path}`);
  const json = await get(`${ORIGIN}/${path}?format=json`);
  await writeFile(`${RAW_DIR}/${slug}.html`, html);
  await writeFile(`${RAW_DIR}/${slug}.json`, json);
  const data = JSON.parse(json);
  const bodies = [data.mainContent || "", ...(data.items || []).map((i) => i.body || ""), data.item?.body || ""].join("\n");
  const title = data.item?.title || data.collection?.title || "";
  console.log(`page /${path} -> ${slug}`);
  return { slug, title, html, json, data, texts: visibleTexts(html + bodies) };
}

async function captureImage(url) {
  const name = localImageName(url);
  const out = `${IMG_DIR}/${name}`;
  if (!(await exists(out))) {
    const buf = await get(`${url}?format=2500w`, "buffer");
    await sharp(buf).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
  }
  return `/assets/img/${name}`;
}

async function pool(items, size, fn) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }));
  return results;
}

async function main() {
  for (const d of [RAW_DIR, IMG_DIR, DL_DIR]) await mkdir(d, { recursive: true });

  const pages = [];
  for (const p of PAGES) pages.push(await capturePage(p));
  const news = pages.find((p) => p.slug === "news");
  for (const item of news.data.items) pages.push(await capturePage(item.fullUrl.replace(/^\//, "")));

  const imageUrls = [...new Set(pages.flatMap((p) => extractImageUrls(p.html + p.json)))];
  console.log(`downloading ${imageUrls.length} images`);
  const images = {};
  const failed = [];
  await pool(imageUrls, 4, async (url) => {
    try {
      images[url] = await captureImage(url);
    } catch (e) {
      failed.push(`${url} (${e.message})`);
    }
  });

  // The home page "Downloads" block links the free track.
  const $ = cheerio.load(pages.find((p) => p.slug === "home").html);
  const dlLink = $("a").filter((_, a) => /download/i.test($(a).text())).first().attr("href") || null;
  let download = null;
  if (dlLink) {
    const url = new URL(dlLink, ORIGIN).href;
    const isFile = /\.(mp3|wav|zip|m4a|flac|aiff?)(\?|$)/i.test(url) || url.includes("static1.squarespace.com");
    if (isFile) {
      const file = decodeURIComponent(url.split("?")[0].split("/").pop()).replace(/[^\w.-]+/g, "-");
      if (!(await exists(`${DL_DIR}/${file}`))) await writeFile(`${DL_DIR}/${file}`, await get(url, "buffer"));
      download = { remote: url, local: `/assets/dl/${file}` };
    } else {
      download = { remote: url, local: null };
    }
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    images,
    download,
    pages: Object.fromEntries(pages.map((p) => [p.slug, { title: p.title, texts: p.texts }])),
  };
  await writeFile("capture/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  console.log(`images: ${Object.keys(images).length} ok, ${failed.length} failed`);
  failed.forEach((f) => console.log(`  FAILED ${f}`));
  console.log(`download: ${JSON.stringify(download)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
