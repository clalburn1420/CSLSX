import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { build } from "./helpers.mjs";
import { serve } from "../scripts/serve-site.mjs";

let server, base, browser;

before(async () => {
  build();
  server = await serve("_site");
  base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(path, options = {}) {
  const page = await browser.newPage(options);
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(base + path, { waitUntil: "load" });
  return page;
}

test("with JavaScript off, no dead Play buttons are visible", { timeout: 60000 }, async () => {
  const page = await open("/videos/", { javaScriptEnabled: false });
  const visible = await page.locator(".player__play").evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).display !== "none").length);
  assert.equal(visible, 0);
  assert.equal(await page.locator(".player__link").count(), 10);
  await page.close();
});

test("a playing video sits above the grain overlay", { timeout: 60000 }, async () => {
  const page = await open("/videos/");
  await page.locator(".player__play").first().click();
  const { player, grain } = await page.evaluate(() => {
    const fig = document.querySelector(".player.is-playing");
    return {
      player: Number(getComputedStyle(fig).zIndex) || 0,
      grain: Number(getComputedStyle(document.body, "::after").zIndex) || 0,
    };
  });
  assert.ok(player > grain, `player z-index ${player} must exceed grain ${grain}`);
  await page.close();
});
