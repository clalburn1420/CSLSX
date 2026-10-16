import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractImageUrls,
  localImageName,
  parseEmbed,
  cleanBody,
} from "../scripts/lib/capture-utils.mjs";

const CDN = "https://images.squarespace-cdn.com/content/v1";

test("extractImageUrls dedupes and strips query strings", () => {
  const html = `<img data-src="${CDN}/x/a.jpg?format=500w"><img src="${CDN}/x/a.jpg">`;
  assert.deepEqual(extractImageUrls(html), [`${CDN}/x/a.jpg`]);
});

test("extractImageUrls reads srcset and decodes entities", () => {
  const html = `<img srcset="${CDN}/x/b.png?format=100w 100w, ${CDN}/x/c.png?format=300w 300w"><meta content="${CDN}/x/d.jpg?a=1&amp;b=2">`;
  assert.deepEqual(extractImageUrls(html).sort(), [`${CDN}/x/b.png`, `${CDN}/x/c.png`, `${CDN}/x/d.jpg`]);
});

test("extractImageUrls cuts off JSON escapes and share-link params", () => {
  const json = `"${CDN}/x/New+Oblivion1.jpg\\\\" "${CDN}/x/New+Oblivion1.jpg&url=http%3A%2F%2Fwww.cslsx.com%2Fnews"`;
  assert.deepEqual(extractImageUrls(json), [`${CDN}/x/New+Oblivion1.jpg`]);
});

test("localImageName sanitizes plus signs and non-ASCII", () => {
  const name = localImageName(`${CDN}/55e/1443994697169-S4/Film+ou+Visa+de+censure+num%C3%A9ro+X10.png`);
  assert.match(name, /^film-ou-visa-de-censure-num-ro-x10-[0-9a-f]{8}\.webp$/);
});

test("localImageName keeps same-basename images distinct", () => {
  const a = localImageName(`${CDN}/55e/111-AAA/image-asset.jpeg`);
  const b = localImageName(`${CDN}/55e/222-BBB/image-asset.jpeg`);
  assert.notEqual(a, b);
  assert.match(a, /^image-asset-[0-9a-f]{8}\.webp$/);
});

test("parseEmbed unwraps embedly YouTube", () => {
  const src = "//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2Fr221_Qz7aZ4%3Ffeature%3Doembed&display_name=YouTube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dr221_Qz7aZ4";
  assert.deepEqual(parseEmbed(src), { provider: "youtube", id: "r221_Qz7aZ4", url: "https://www.youtube.com/watch?v=r221_Qz7aZ4" });
});

test("parseEmbed reads plain YouTube and Vimeo", () => {
  assert.equal(parseEmbed("//www.youtube.com/embed/FXVNtKYXSOU?wmode=opaque").id, "FXVNtKYXSOU");
  assert.deepEqual(parseEmbed("https://player.vimeo.com/video/14468086?title=0"), { provider: "vimeo", id: "14468086", url: "https://vimeo.com/14468086" });
});

test("parseEmbed reads both Spotify embed styles", () => {
  assert.deepEqual(parseEmbed("https://embed.spotify.com/?uri=spotify%3Aalbum%3A0i7ajmoD17irOPfC8QK0FX&theme=white"),
    { provider: "spotify", id: "album/0i7ajmoD17irOPfC8QK0FX", url: "https://open.spotify.com/album/0i7ajmoD17irOPfC8QK0FX" });
  assert.equal(parseEmbed("//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fopen.spotify.com%2Fembed%2Falbum%2F58oZQt3djCiYGIIRwj1kgw&display_name=Spotify").id, "album/58oZQt3djCiYGIIRwj1kgw");
});

test("parseEmbed reads SoundCloud tracks", () => {
  const e = parseEmbed("https://w.soundcloud.com/player/?visual=true&amp;url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F991250071&amp;show_artwork=true");
  assert.equal(e.provider, "soundcloud");
  assert.equal(e.id, "991250071");
});

test("parseEmbed returns null for unknown sources", () => {
  assert.equal(parseEmbed("https://example.com"), null);
});

test("cleanBody strips Squarespace cruft and converts iframes", () => {
  const out = cleanBody('<div class="sqs-block"><p style="x">Hi</p><script>bad()</script><iframe src="//www.youtube.com/embed/FXVNtKYXSOU"></iframe></div>', {});
  assert.match(out, /<p>Hi<\/p>/);
  assert.doesNotMatch(out, /script|style=|sqs-/);
  assert.match(out, /\{% player "youtube", "FXVNtKYXSOU"/);
});

test("cleanBody rewrites captured image URLs", () => {
  const out = cleanBody(`<p><img data-src="${CDN}/x/a.jpg?format=500w" alt="A"></p>`, { [`${CDN}/x/a.jpg`]: "/assets/img/a-12345678.webp" });
  assert.match(out, /<img [^>]*src="\/assets\/img\/a-12345678\.webp"/);
  assert.match(out, /<img [^>]*alt="A"/);
  assert.doesNotMatch(out, /data-src|squarespace/);
});
