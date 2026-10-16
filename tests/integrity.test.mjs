import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { build } from "./helpers.mjs";
import { findBrokenLinks } from "../scripts/check-links.mjs";
import { findMissingContent } from "../scripts/check-content.mjs";

before(build);

const manifest = JSON.parse(readFileSync("capture/manifest.json", "utf8"));
const news = JSON.parse(readFileSync("capture/raw/news.json", "utf8"));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("checkers catch a broken link and a missing paragraph in a fixture site", () => {
  const dir = mkdtempSync(join(tmpdir(), "cslsx-"));
  mkdirSync(join(dir, "ok"));
  writeFileSync(join(dir, "ok", "index.html"), "<p>Present text that is long enough.</p>");
  writeFileSync(join(dir, "index.html"), '<a href="/ok/">fine</a><a href="/gone/">broken</a><img src="/assets/x.webp">');
  assert.deepEqual(findBrokenLinks(dir).sort(), ["index.html → /assets/x.webp", "index.html → /gone/"]);
  const fixture = { images: {}, pages: { a: { texts: ["Present text that is long enough.", "This paragraph was never published."] } } };
  assert.deepEqual(findMissingContent(dir, fixture), ["text: this paragraph was never published."]);
});

test("no internal link or asset reference is broken", () => {
  assert.deepEqual(findBrokenLinks("_site"), []);
});

test("every captured paragraph and image made it into the site", () => {
  assert.deepEqual(findMissingContent("_site", manifest), []);
});

test("old Squarespace-only URLs redirect to the nearest page", () => {
  const expected = {
    "releases/x310ryvv25xgpl6izwro0dy3swrxg9": "/releases/",
    cart: "/releases/",
    mixes: "/",
    main: "/",
    "home-wav": "/",
  };
  for (const [from, to] of Object.entries(expected)) {
    const file = `_site/${from}/index.html`;
    assert.ok(existsSync(file), `${from} redirect missing`);
    const html = readFileSync(file, "utf8");
    assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${to.replace(/\//g, "\\/")}"`), `${from} → ${to}`);
    assert.match(html, /name="robots" content="noindex"/);
  }
});

test("every original news URL still resolves", () => {
  for (const item of news.items) {
    assert.ok(existsSync(`_site${item.fullUrl}/index.html`), `${item.fullUrl} missing`);
  }
});

test("the built site never references Squarespace", () => {
  const offenders = walk("_site").filter((p) => /\.(html|css|js)$/.test(p) && /squarespace/i.test(readFileSync(p, "utf8")));
  assert.deepEqual(offenders, []);
});
