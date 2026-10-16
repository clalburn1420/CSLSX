import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

// Stops at backslashes (JSON escapes) and "&" (share-link params glued onto the URL).
const CDN_RE = /https?:\/\/images\.squarespace-cdn\.com\/[^\s"'<>),\\&]+/g;

const decodeEntities = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const stripQuery = (url) => url.split(/[?#]/)[0];

/** Unique Squarespace CDN image URLs in a chunk of HTML, query strings removed. */
export function extractImageUrls(html) {
  const found = decodeEntities(html).match(CDN_RE) || [];
  return [...new Set(found.map(stripQuery))];
}

/** ASCII-safe, collision-free local filename for a remote image. */
export function localImageName(url) {
  const raw = stripQuery(url).split("/").pop();
  let base;
  try {
    base = decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    base = raw;
  }
  base = base.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "image";
  const hash = createHash("sha1").update(stripQuery(url)).digest("hex").slice(0, 8);
  return `${slug}-${hash}.webp`;
}

/** Recognize a YouTube / Vimeo / Spotify / SoundCloud embed URL. */
export function parseEmbed(src) {
  if (!src) return null;
  let s = decodeEntities(src);
  if (s.startsWith("//")) s = "https:" + s;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.hostname.endsWith("embedly.com") && u.searchParams.get("src")) {
    return parseEmbed(u.searchParams.get("src"));
  }
  const host = u.hostname.replace(/^www\./, "");
  let m;
  if ((host === "youtube.com" || host === "youtube-nocookie.com") && (m = u.pathname.match(/\/embed\/([\w-]+)/))) {
    return { provider: "youtube", id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
  }
  if (host === "youtube.com" && u.pathname === "/watch" && u.searchParams.get("v")) {
    const id = u.searchParams.get("v");
    return { provider: "youtube", id, url: `https://www.youtube.com/watch?v=${id}` };
  }
  if (host === "player.vimeo.com" && (m = u.pathname.match(/\/video\/(\d+)/))) {
    return { provider: "vimeo", id: m[1], url: `https://vimeo.com/${m[1]}` };
  }
  if (host === "embed.spotify.com" && (m = (u.searchParams.get("uri") || "").match(/^spotify:(\w+):(\w+)$/))) {
    return { provider: "spotify", id: `${m[1]}/${m[2]}`, url: `https://open.spotify.com/${m[1]}/${m[2]}` };
  }
  if (host === "open.spotify.com" && (m = u.pathname.match(/^\/(?:embed\/)?(album|track|playlist|artist)\/(\w+)/))) {
    return { provider: "spotify", id: `${m[1]}/${m[2]}`, url: `https://open.spotify.com/${m[1]}/${m[2]}` };
  }
  if (host === "w.soundcloud.com" && (m = (u.searchParams.get("url") || "").match(/tracks\/(\d+)/))) {
    return { provider: "soundcloud", id: m[1], url: `https://api.soundcloud.com/tracks/${m[1]}` };
  }
  return null;
}

const shortcode = (e) => `{% player "${e.provider}", "${e.id}", "${e.url}" %}`;

const KEEP_ATTRS = { a: ["href"], img: ["src", "alt"] };
const UNWRAP = new Set(["div", "span", "section", "article", "font"]);

/** Turn a Squarespace post body into clean HTML with player shortcodes and local images. */
export function cleanBody(html, imageMap) {
  const $ = cheerio.load(html, null, false);
  $("script, style, noscript, link, meta, svg, button, form").remove();

  // Video blocks keep their iframe escaped in data-html; plain iframes may also appear.
  $("[data-html]").each((_, el) => {
    const inner = decodeEntities($(el).attr("data-html"));
    const src = (inner.match(/src="([^"]+)"/) || [])[1];
    const embed = parseEmbed(src);
    if (embed) $(el).replaceWith(`\n\n${shortcode(embed)}\n\n`);
  });
  // An embed block that was never filled in renders only its editor placeholder text.
  $('[data-sqsp-block="embed"], .sqs-embed-container').each((_, el) => {
    if (!$(el).find("iframe").length && !$(el).text().includes("{% player")) $(el).remove();
  });
  $("iframe").each((_, el) => {
    const embed = parseEmbed($(el).attr("src"));
    $(el).replaceWith(embed ? `\n\n${shortcode(embed)}\n\n` : "");
  });

  $("img").each((_, el) => {
    const $el = $(el);
    const src = stripQuery(decodeEntities($el.attr("data-src") || $el.attr("data-image") || $el.attr("src") || ""));
    if (imageMap[src]) $el.attr("src", imageMap[src]);
    else if (src.includes("squarespace")) $el.remove();
  });

  $("*").each((_, el) => {
    const keep = KEEP_ATTRS[el.tagName] || [];
    for (const name of Object.keys(el.attribs || {})) {
      if (!keep.includes(name)) $(el).removeAttr(name);
    }
  });

  // Unwrap layout containers innermost-first so their children survive.
  let wrappers;
  while ((wrappers = $("*").filter((_, el) => UNWRAP.has(el.tagName))).length) {
    wrappers.last().replaceWith(wrappers.last().contents());
  }

  $("p").each((_, el) => {
    if (!$(el).text().trim() && !$(el).find("img").length) $(el).remove();
  });

  return $.html().replace(/\n{3,}/g, "\n\n").trim();
}
