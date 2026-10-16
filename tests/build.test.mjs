import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { build } from "./helpers.mjs";

before(build);

test("home page is built with document basics", () => {
  assert.ok(existsSync("_site/index.html"), "_site/index.html missing");
  const html = readFileSync("_site/index.html", "utf8");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>CSLSX<\/title>/);
});
