import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { build } from "./helpers.mjs";

before(build);

const html = (p) => readFileSync(join("_site", p), "utf8");
const count = (s, re) => (s.match(re) || []).length;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("every page in the nav is built, plus a 404", () => {
  for (const p of ["releases", "singles", "artists", "events", "videos", "news", "label"]) {
    assert.ok(existsSync(`_site/${p}/index.html`), `/${p}/ missing`);
  }
  assert.ok(existsSync("_site/404.html"), "404 missing");
});

test("videos: ten click-to-load players, each with a working fallback link", () => {
  const page = html("videos/index.html");
  const figures = page.match(/<figure class="player[^"]*"[\s\S]*?<\/figure>/g) || [];
  assert.equal(figures.length, 10);
  for (const f of figures) assert.match(f, /<a [^>]*href="https:\/\/(www\.youtube\.com|vimeo\.com)\//);
});

test("music: five players with fallback links to their services", () => {
  const page = html("singles/index.html");
  const figures = page.match(/<figure class="player[^"]*"[\s\S]*?<\/figure>/g) || [];
  assert.equal(figures.length, 5);
  for (const f of figures) assert.match(f, /href="https:\/\/(open\.spotify\.com|api\.soundcloud\.com|soundcloud\.com)\//);
});

test("no page ships a third-party iframe up front", () => {
  const offenders = walk("_site").filter((p) => p.endsWith(".html") && /<iframe/i.test(readFileSync(p, "utf8")));
  assert.deepEqual(offenders, []);
});

test("news posts convert their embeds into players", () => {
  const post = html("news/2021/2/23/everything-is-alright/index.html");
  assert.equal(count(post, /<figure class="player/g), 1);
  assert.doesNotMatch(post, /\{%/);
});

test("players inside news posts reuse the site's artwork for that track or video", () => {
  for (const p of ["news/2021/2/23/everything-is-alright", "news/2021/3/27/holy-hell-lyric-video-posted"]) {
    const fig = html(`${p}/index.html`).match(/<figure class="player[\s\S]*?<\/figure>/)[0];
    assert.match(fig, /<img src="\/assets\/img\/[^"]+\.webp"/, `${p}: player has no artwork`);
  }
});

test("news index lists all seven posts, newest first", () => {
  const page = html("news/index.html");
  const dates = [...page.matchAll(/<time [^>]*datetime="([\d-]+)"/g)].map((m) => m[1]);
  assert.equal(dates.length, 7);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("contact, bio and events carry their key content", () => {
  assert.match(html("label/index.html"), /mailto:cslsx\.is\.real@gmail\.com/);
  assert.match(html("label/index.html"), /mailto:andrew\.alburn@gmail\.com/);
  assert.match(html("artists/index.html"), /SPIN/);
  assert.match(html("artists/index.html"), /Peter Katis/);
  assert.match(html("events/index.html"), /No upcoming shows/);
});

test("releases list all four records with streaming links and no cart", () => {
  const page = html("releases/index.html");
  for (const t of ["Beyond The Haze", "Ritualize", "Everything Void", "Keep On Shining"]) assert.match(page, new RegExp(t));
  assert.match(page, /open\.spotify\.com\/album\/6zSPYImKXzl3s3V64GHExI/);
  assert.doesNotMatch(page, /cart/i);
});

test("current page is marked in the nav", () => {
  assert.match(html("videos/index.html"), /<a href="\/videos\/" aria-current="page">/);
});
