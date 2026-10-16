import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const data = (name) => JSON.parse(readFileSync(`src/_data/${name}.json`, "utf8"));
const onDisk = (webPath) => existsSync(join("src", webPath));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const frontMatter = (file) => {
  const fm = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)[1];
  return Object.fromEntries(fm.split("\n").map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
};

test("videos: all 10 with provider, id and a local poster", () => {
  const videos = data("videos");
  assert.equal(videos.length, 10);
  for (const v of videos) {
    assert.ok(["youtube", "vimeo"].includes(v.provider), `${v.title}: provider ${v.provider}`);
    assert.ok(v.id, `${v.title}: id`);
    assert.ok(onDisk(v.poster), `${v.title}: poster ${v.poster} missing`);
  }
});

test("music: the three Spotify albums and two SoundCloud tracks", () => {
  const ids = data("music").map((m) => m.id);
  for (const id of ["album/58oZQt3djCiYGIIRwj1kgw", "album/0i7ajmoD17irOPfC8QK0FX", "album/6zSPYImKXzl3s3V64GHExI", "991250071", "977336197"]) {
    assert.ok(ids.includes(id), `music missing ${id}`);
  }
});

test("releases: each has a title, local cover and at least one link", () => {
  const releases = data("releases");
  assert.ok(releases.find((r) => r.title === "Ritualize"), "Ritualize missing");
  assert.ok(releases.find((r) => r.title === "Beyond The Haze"), "Beyond The Haze missing");
  for (const r of releases) {
    assert.ok(onDisk(r.cover), `${r.title}: cover ${r.cover} missing`);
    assert.ok(r.links.length > 0, `${r.title}: no links`);
  }
});

test("news: seven posts at their original Squarespace paths", () => {
  const files = readdirSync("src/news").filter((f) => f.endsWith(".md"));
  assert.equal(files.length, 7);
  const permalinks = new Set(files.map((f) => frontMatter(join("src/news", f)).permalink));
  assert.deepEqual(permalinks, new Set([
    "/news/2021/7/30/new-oblivion-music-video/",
    "/news/2021/7/30/beyond-the-haze-lp-released-today/",
    "/news/2021/3/27/holy-hell-lyric-video-posted/",
    "/news/2021/2/23/everything-is-alright/",
    "/news/2021/2/5/i-can-feel-us-slip-into-oblivion/",
    "/news/2021/1/10/notes-from-the-underground/",
    "/news/2017/11/5/new-websitenew-music-coming/",
  ]));
  for (const f of files) {
    const fm = frontMatter(join("src/news", f));
    assert.ok(fm.title && fm.date, `${f}: title/date`);
    if (fm.image) assert.ok(onDisk(fm.image), `${f}: image ${fm.image} missing`);
  }
});

test("src contains no Squarespace URLs or scripts", () => {
  const offenders = walk("src")
    .filter((p) => /\.(md|njk|json|html|mjs)$/.test(p))
    .filter((p) => /squarespace-cdn\.com|static1\.squarespace|<script/i.test(readFileSync(p, "utf8")));
  assert.deepEqual(offenders, []);
});

test("site: nav labels, emails and download", () => {
  const site = data("site");
  assert.deepEqual(site.nav.map((n) => n.label), ["Releases", "Music", "Bio", "Events", "Videos", "News", "Contact"]);
  assert.equal(site.emails.primary, "cslsx.is.real@gmail.com");
  assert.equal(site.emails.secondary, "andrew.alburn@gmail.com");
  assert.ok(onDisk(site.download.url), "download file missing");
});

test("bio: SPIN quote and four paragraphs", () => {
  const bio = data("bio");
  assert.equal(bio.quote.source, "SPIN");
  assert.equal(bio.paragraphs.length, 4);
});
