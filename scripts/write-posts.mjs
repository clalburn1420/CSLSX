// Writes src/news/<slug>.md for every captured Squarespace post.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { cleanBody } from "./lib/capture-utils.mjs";

const manifest = JSON.parse(readFileSync("capture/manifest.json", "utf8"));
const news = JSON.parse(readFileSync("capture/raw/news.json", "utf8"));
const stripQuery = (u) => (u || "").split("?")[0];

mkdirSync("src/news", { recursive: true });

for (const item of news.items) {
  const slug = item.fullUrl.split("/").pop();
  const image = manifest.images[stripQuery(item.assetUrl)];
  const body = cleanBody(item.body || "", manifest.images)
    .split("\n").map((l) => l.trimStart()).join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const fm = [
    "---",
    `title: ${JSON.stringify(item.title)}`,
    `date: ${new Date(item.publishOn).toISOString().slice(0, 10)}`,
    `permalink: ${item.fullUrl}/`,
    image ? `image: ${image}` : null,
    `originalUrl: https://www.cslsx.com${item.fullUrl}`,
    "---",
  ].filter(Boolean).join("\n");
  writeFileSync(`src/news/${slug}.md`, `${fm}\n\n${body}\n`);
  console.log(`${slug}.md  (${body.length} chars${image ? ", image" : ""})`);
}
