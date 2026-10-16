// Fetches artwork the Squarespace capture lacks: album covers and release dates from
// Spotify, SoundCloud single artwork, and YouTube thumbnails for videos without a poster.
// Writes WebP files into src/assets/img and prints what it found as JSON.
import { access } from "node:fs/promises";
import sharp from "sharp";

const exists = (p) => access(p).then(() => true, () => false);
const getJson = (u) => fetch(u).then((r) => r.json());
const getBuf = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return Buffer.from(await r.arrayBuffer());
};

async function save(url, name) {
  const out = `src/assets/img/${name}.webp`;
  if (!(await exists(out))) await sharp(await getBuf(url)).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  return `/assets/img/${name}.webp`;
}

const result = { spotify: {}, soundcloud: {}, youtube: {} };

for (const id of ["58oZQt3djCiYGIIRwj1kgw", "0i7ajmoD17irOPfC8QK0FX", "6zSPYImKXzl3s3V64GHExI"]) {
  const url = `https://open.spotify.com/album/${id}`;
  const o = await getJson(`https://open.spotify.com/oembed?url=${url}`);
  const page = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } }).then((r) => r.text());
  const date = (page.match(/music:release_date" content="([\d-]+)"/) || [])[1] || null;
  const big = o.thumbnail_url.replace("00001e02", "0000b273"); // 640px variant
  result.spotify[id] = { title: o.title, date, cover: await save(big, `cover-${id}`) };
}

for (const id of ["991250071", "977336197"]) {
  const o = await getJson(`https://soundcloud.com/oembed?format=json&url=https://api.soundcloud.com/tracks/${id}`);
  result.soundcloud[id] = { title: o.title.replace(/ by CSLSX$/, ""), cover: await save(o.thumbnail_url, `sc-${id}`) };
}

for (const id of ["O3xBHerPfcw", "1eGrJtEIepI"]) {
  result.youtube[id] = await save(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, `yt-${id}`);
}

console.log(JSON.stringify(result, null, 2));
