// Markup for a click-to-load player. Without JS (or if the embed is blocked) the
// link to the service is the whole player.
import music from "../src/_data/music.json" with { type: "json" };
import videos from "../src/_data/videos.json" with { type: "json" };

const SERVICE = { youtube: "YouTube", vimeo: "Vimeo", spotify: "Spotify", soundcloud: "SoundCloud" };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Squarespace stored SoundCloud API URLs, which visitors can't open; use the public page.
const publicUrl = (provider, id, url) =>
  provider === "soundcloud" ? music.find((m) => m.id === id)?.url ?? "https://soundcloud.com/cslsx" : url;

// Players embedded in news posts carry no artwork of their own; reuse the site's.
const knownArt = (id) => music.find((m) => m.id === id)?.cover ?? videos.find((v) => v.id === id)?.poster ?? "";

export function renderPlayer(provider, id, url, title = "", poster = "") {
  poster ||= knownArt(id);
  title ||= music.find((m) => m.id === id)?.title ?? videos.find((v) => v.id === id)?.title ?? "";
  const service = SERVICE[provider] ?? provider;
  const href = publicUrl(provider, id, url);
  const label = title ? `${title} on ${service}` : `Listen on ${service}`;
  const art = poster
    ? `<img src="${esc(poster)}" alt="" loading="lazy" decoding="async">`
    : `<span class="player__blank meta" aria-hidden="true">${esc(service)}</span>`;
  return `<figure class="player player--${provider}" data-provider="${provider}" data-id="${esc(id)}" data-title="${esc(title)}">` +
    `<div class="player__frame haze">${art}</div>` +
    `<figcaption class="player__bar"><button type="button" class="player__play slug kicker" hidden>Play</button>` +
    `<a class="player__link kicker" href="${esc(href)}">${esc(label)} ↗</a></figcaption></figure>`;
}
