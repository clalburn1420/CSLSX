// Full-page screenshots for design review: node scripts/shoot.mjs <outDir> <path> [path...]
import { chromium } from "playwright";
const [outDir, ...paths] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, "desktop"], [375, 812, "mobile"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  for (const raw of paths) {
    const p = "/" + raw.replace(/^\/+/, "").replace(/^home$/, "");
    await page.goto(`http://localhost:8080${p}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Walk down the page so lazy images load before the full-page capture.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.waitForLoadState("networkidle");
    const name = (p.replace(/\//g, "_").replace(/^_|_$/g, "") || "home") + `-${tag}.png`;
    await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(name, sw > w ? `OVERFLOW ${sw}px` : "");
  }
}
await browser.close();
