# CSLSX Self-Hosted Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild cslsx.com as an Eleventy static site with a poster-archive design, carrying over all real content, and deploy it to GitHub Pages.

**Architecture:** A one-time capture script pulls Squarespace's rendered HTML + `?format=json` for every page into `capture/raw/`, downloads every image as WebP, and records a manifest. Hand-curated data files and Markdown posts are written from that capture; Eleventy renders them through Nunjucks layouts into `_site/`. Node test scripts check the build (links, content coverage, redirects), and a GitHub Actions workflow deploys `_site/` to Pages.

**Tech Stack:** Node 24, Eleventy 3, Nunjucks, cheerio (capture parsing), sharp (WebP), `@fontsource-variable/archivo` (self-hosted variable font), `node --test`, GitHub Actions `actions/deploy-pages@v4`.

**Spec:** `docs/superpowers/specs/2026-10-15-cslsx-site-design.md`

## Global Constraints

- Site is an archive: no cart, no form service, no CMS, no analytics.
- Nav labels, in order: Releases, Music, Bio, Events, Videos, News, Contact → `/releases/`, `/singles/`, `/artists/`, `/events/`, `/videos/`, `/news/`, `/label/`.
- News posts keep Squarespace paths `/news/YYYY/M/D/slug/` (no zero-padding).
- Redirect stubs: `/releases/x310ryvv25xgpl6izwro0dy3swrxg9/` → `/releases/`, `/cart/` → `/releases/`, `/mixes/` → `/`, `/main/` → `/`, `/home-wav/` → `/`.
- Contact: mailto `cslsx.is.real@gmail.com` (primary), `andrew.alburn@gmail.com` (secondary, as on live page).
- Social links: SoundCloud `https://soundcloud.com/cslsx`, Apple Music `https://itunes.apple.com/us/artist/cslsx/1046532361`, Spotify `https://open.spotify.com/artist/78NphNuUJSgP9uEVm2CKZP`, Facebook `https://www.facebook.com/cslsx`, Instagram `https://www.instagram.com/cslsx/`, Vimeo `https://vimeo.com/cslsx`, YouTube `https://www.youtube.com/user/CSLSX`, Twitter `https://twitter.com/cslsx`.
- No runtime requests to `squarespace-cdn.com` or `squarespace.com` in the built site.
- Font: Archivo variable (wght + wdth), self-hosted; no Google Fonts / Adobe Fonts requests.
- Layout works from 320px with 16px side gutter, no horizontal scroll; honors `prefers-reduced-motion`; text contrast ≥ WCAG AA (4.5:1 body, 3:1 ≥24px).
- Third-party players (YouTube, Vimeo, Spotify, SoundCloud) load only after a click.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Long words in display type at 320px** — "NEW WEBSITE...NEW MUSIC IN THE WORKS!!!" and "CSLSX & LUSHLIFE" set huge must wrap or scale (`clamp()`/`overflow-wrap`), never cause horizontal scroll. Pinned in Task 5 (`check-overflow`).
2. **Blocked or failed third-party embeds** — every click-to-load player has a plain link to the track/video on its service, so it still works with JS off or the embed blocked. Pinned in Task 5 test.
3. **Squarespace image URLs with `+`, `%C3%A9` and duplicate basenames** (e.g. `Film+ou+Visa+de+censure+num%C3%A9ro+X10.png`, many `image-asset.jpeg`) — local filenames must be unique and ASCII-safe. Pinned in Task 2 test.
4. **Squarespace post bodies carrying inline styles, `<script>`, embedly iframes and `sqs-` wrappers** — posts must render as clean HTML with embeds converted to click-to-load. Pinned in Task 3 test.
5. **Old inbound URLs** without trailing slash or on `www.` — Pages serves `/news/.../slug` → `/news/.../slug/`; `www` handled by DNS CNAME. Pinned in Task 6 (`check-links` covers every captured `fullUrl`).

---

## File Structure

```
package.json, eleventy.config.mjs, .gitignore
scripts/capture.mjs            one-time capture (network)
scripts/lib/capture-utils.mjs  pure helpers: image URL extraction, filename, embed parsing, body cleaning
scripts/check-links.mjs        internal link + asset check over _site/
scripts/check-content.mjs      every captured text block & image appears in _site/
scripts/check-overflow.mjs     headless check: no horizontal scroll at 320px (Playwright)
tests/*.test.mjs               node --test
capture/raw/                   raw HTML + JSON per page (committed, provenance)
capture/manifest.json          { images: {remoteUrl: localPath}, pages: {...}, texts: [...] }
src/_data/site.json            nav, socials, emails
src/_data/releases.json        releases with stream links + cover image
src/_data/music.json           Spotify/SoundCloud items
src/_data/videos.json          [{title, provider, id, poster}]
src/_data/events.json          [] (past shows later)
src/_data/bio.json             paragraphs + pull quote
src/_includes/layouts/base.njk, page.njk, post.njk
src/_includes/partials/nav.njk, footer.njk, player.njk, wordmark.njk
src/assets/css/{tokens,base,grid,poster,components}.css
src/assets/js/player.js        click-to-load embeds + mobile nav
src/assets/img/                WebP images from capture
src/assets/dl/                 free download file
src/index.njk, releases.njk, singles.njk, artists.njk, events.njk, videos.njk, label.njk, 404.njk
src/news/index.njk, src/news/*.md, src/news/news.11tydata.mjs
src/redirects.njk              paginated redirect stubs
src/CNAME
.github/workflows/deploy.yml
docs/DNS-CUTOVER.md
```

---

### Task 1: Scaffold Eleventy project with test harness

**Files:**
- Create: `package.json`, `eleventy.config.mjs`, `.gitignore`, `src/_includes/layouts/base.njk`, `src/index.njk` (placeholder), `tests/build.test.mjs`

**Interfaces:**
- Produces: `npm run build` → `_site/`; `npm test` → `node --test tests/`; `npm run serve` → dev server on :8080. Input dir `src`, output `_site`, passthrough `src/assets` → `/assets`, `src/CNAME` → `/CNAME`. Global data available as `site`, `releases`, `music`, `videos`, `events`, `bio`.

- [ ] **Step 1: Write failing test** `tests/build.test.mjs`: runs `npx @11ty/eleventy` once (in `before`), asserts `_site/index.html` exists and contains `<html lang="en">` and `<title>CSLSX</title>`.
- [ ] **Step 2: Run** `npm test` → FAIL (no package / no output).
- [ ] **Step 3: Implement** `package.json` (`"type":"module"`, devDeps `@11ty/eleventy@^3`, `cheerio`, `sharp`, `@fontsource-variable/archivo`, `playwright`), `eleventy.config.mjs`, minimal `base.njk` (`<title>{{ title + " — " if title }}CSLSX</title>`), placeholder `index.njk`. `.gitignore`: `node_modules/ _site/`.
- [ ] **Step 4: Run** `npm install && npm test` → PASS.
- [ ] **Step 5: Commit** `chore: scaffold Eleventy site`.

### Task 2: Capture script

**Files:**
- Create: `scripts/lib/capture-utils.mjs`, `scripts/capture.mjs`, `tests/capture-utils.test.mjs`
- Output (committed): `capture/raw/*.html|json`, `capture/manifest.json`, `src/assets/img/*.webp`, `src/assets/dl/*`

**Interfaces:**
- Produces in `capture-utils.mjs`:
  - `extractImageUrls(html: string): string[]` — unique `images.squarespace-cdn.com` URLs from `src`, `data-src`, `data-image`, `srcset`, `content`; query strings stripped; HTML entities decoded.
  - `localImageName(url: string): string` — `<sanitized-basename>-<8 hex of sha1(url)>.webp`; basename decoded, lowercased, non-`[a-z0-9]` runs → `-`, trimmed to 40 chars.
  - `parseEmbed(src: string): {provider: 'youtube'|'vimeo'|'spotify'|'soundcloud', id: string, url: string} | null` — handles embedly-wrapped URLs (`cdn.embedly.com/widgets/media.html?src=...`), `//www.youtube.com/embed/ID`, `player.vimeo.com/video/ID`, `embed.spotify.com/?uri=spotify:album:ID`, `open.spotify.com/embed/album/ID`, `w.soundcloud.com/player/?url=...tracks/ID`. `url` is the public page URL (e.g. `https://www.youtube.com/watch?v=ID`).
  - `cleanBody(html: string, imageMap: Record<string,string>): string` — drops `<script>`, `<style>`, `style=`/`class=`/`id=`/`data-*` attributes and `sqs-` wrapper divs (keeping children); rewrites image URLs via `imageMap`; replaces any recognized iframe with `{% player provider, id, url %}` shortcode text.
- `capture.mjs` (CLI, network): for each page in `['', 'releases', 'releases/x310ryvv25xgpl6izwro0dy3swrxg9', 'singles', 'artists', 'events', 'videos', 'news', 'label']` plus each news `fullUrl`, saves rendered HTML and `?format=json` to `capture/raw/<slug>.html|.json`; collects image URLs from both; downloads each at `?format=2500w`, converts with sharp to WebP (max width 2400, quality 80) at `src/assets/img/<localImageName>`; downloads the *Keep On Shining* download target into `src/assets/dl/` if it is a file URL; writes `capture/manifest.json` `{ images, pages: {slug: {title, texts: string[]}}, download }`. `texts` = trimmed text of each `.sqs-block-html` / post body paragraph ≥ 20 chars. Idempotent: skips existing image files.

- [ ] **Step 1: Write failing tests** in `tests/capture-utils.test.mjs`:
  - `extractImageUrls` on `<img data-src="https://images.squarespace-cdn.com/content/v1/x/a.jpg?format=500w">` and the same URL again → `['https://images.squarespace-cdn.com/content/v1/x/a.jpg']`.
  - `localImageName('https://images.squarespace-cdn.com/content/v1/55e/1443994697169-S4/Film+ou+Visa+de+censure+num%C3%A9ro+X10.png')` matches `/^film-ou-visa-de-censure-num-ro-x10-[0-9a-f]{8}\.webp$/` (`+` → space → `-`; decoded `é` is non-ASCII → `-`).
  - Two URLs both ending `/image-asset.jpeg` with different paths → different names.
  - `parseEmbed` on the embedly YouTube src for `r221_Qz7aZ4` → `{provider:'youtube', id:'r221_Qz7aZ4', url:'https://www.youtube.com/watch?v=r221_Qz7aZ4'}`; on `https://player.vimeo.com/video/14468086?title=0` → vimeo `14468086`; on `https://embed.spotify.com/?uri=spotify%3Aalbum%3A0i7ajmoD17irOPfC8QK0FX&theme=white` → spotify `album/0i7ajmoD17irOPfC8QK0FX`; on soundcloud player URL with `tracks%2F991250071` → soundcloud `991250071`; on `https://example.com` → `null`.
  - `cleanBody('<div class="sqs-block"><p style="x">Hi</p><script>bad()</script><iframe src="//www.youtube.com/embed/FXVNtKYXSOU"></iframe></div>', {})` → contains `<p>Hi</p>`, no `script`, no `style=`, no `sqs-`, contains `{% player "youtube", "FXVNtKYXSOU"`.
- [ ] **Step 2: Run** `node --test tests/capture-utils.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `capture-utils.mjs` (cheerio for HTML; `node:crypto` sha1).
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Implement and run** `node scripts/capture.mjs`. Expected: `capture/raw/` has 16 HTML + 16 JSON files (9 pages + 7 posts); console reports image count; `manifest.json` written; `grep -c . capture/manifest.json` non-zero.
- [ ] **Step 6: Commit** `feat: capture Squarespace content and images` (include `capture/`, `src/assets/img/`, `src/assets/dl/`).

### Task 3: Content data and news posts

**Files:**
- Create: `src/_data/{site,releases,music,videos,events,bio}.json`, `src/news/*.md` (7), `src/news/news.11tydata.mjs`, `scripts/write-posts.mjs`, `tests/content-data.test.mjs`

**Interfaces:**
- Consumes: `capture/manifest.json`, `capture/raw/*`, `cleanBody`, `parseEmbed`, `localImageName` (Task 2).
- Produces:
  - `site.json`: `{ title:"CSLSX", nav:[{label,url}], socials:[{name,url}], emails:{primary, secondary}, download:{title:"Keep On Shining", url} }` (values per Global Constraints).
  - `releases.json`: `[{ title, artists, year, cover:"/assets/img/...webp", links:[{name,url}] }]` — at least *Ritualize* (CSLSX & Lushlife) and the albums behind the three Spotify IDs on `/singles` (`58oZQt3djCiYGIIRwj1kgw`, `0i7ajmoD17irOPfC8QK0FX`, `6zSPYImKXzl3s3V64GHExI`) and *Beyond The Haze*; titles/years read from capture (Spotify embed titles/news posts).
  - `music.json`: `[{ title, provider, id, url }]` for the 3 Spotify albums + 2 SoundCloud tracks (`991250071`, `977336197`).
  - `videos.json`: `[{ title, provider, id, url, poster }]` — 10 entries in live-page order; `poster` = local WebP of the thumbnail image next to each embed on `/videos`.
  - `bio.json`: `{ quote:{text, source:"SPIN"}, paragraphs:[...] }` from `/artists`.
  - `events.json`: `[]`.
  - `src/news/<slug>.md` front matter: `title`, `date` (ISO from `publishOn`), `permalink: /news/YYYY/M/D/slug/` (from `fullUrl`), `image` (local WebP of `assetUrl`), `originalUrl`; body = `cleanBody(item.body)`. Generated by `scripts/write-posts.mjs` from `capture/raw/news.json`.
  - `news.11tydata.mjs`: `layout: "layouts/post.njk"`, `tags: "news"`.

- [ ] **Step 1: Write failing tests** `tests/content-data.test.mjs`:
  - `videos.json` length 10; every entry has `provider ∈ {youtube, vimeo}`, non-empty `id`, `poster` file exists on disk.
  - `music.json` contains the 3 Spotify IDs and 2 SoundCloud IDs above.
  - 7 files in `src/news/*.md`; their permalinks equal `{'/news/2021/7/30/new-oblivion-music-video/', '/news/2021/7/30/beyond-the-haze-lp-released-today/', '/news/2021/3/27/holy-hell-lyric-video-posted/', '/news/2021/2/23/everything-is-alright/', '/news/2021/2/5/i-can-feel-us-slip-into-oblivion/', '/news/2021/1/10/notes-from-the-underground/', '/news/2017/11/5/new-websitenew-music-coming/'}`.
  - No file under `src/` contains `squarespace-cdn.com` or `<script`.
  - `site.json` nav labels equal `['Releases','Music','Bio','Events','Videos','News','Contact']`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Write** `write-posts.mjs` and run it; hand-write the JSON data files from the capture.
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Commit** `feat: add site content data and news posts`.

### Task 4: Design system and home page mockup — USER SIGN-OFF GATE

**Files:**
- Create: `src/assets/css/{tokens,base,grid,poster,components}.css`, `src/_includes/partials/{nav,footer,wordmark}.njk`, `src/_includes/layouts/page.njk`; Modify: `base.njk`, `src/index.njk`, `eleventy.config.mjs` (passthrough font file from `node_modules/@fontsource-variable/archivo/files/archivo-latin-full-normal.woff2` → `/assets/fonts/archivo.woff2`)

**Interfaces:**
- Produces CSS custom properties in `tokens.css`: `--paper`, `--ink`, `--spot` (accent), `--grid-cols` (12 desktop / 4 mobile), `--gutter: 16px` minimum, type scale `--t-mega` (wordmark, `clamp()`), `--t-xl`, `--t-l`, `--t-m`, `--t-s`, `--t-xs`; utility `.halftone` (SVG-filter/CSS grain over an `<img>`); `page.njk` layout with `title` + `kicker` front matter. Wordmark partial `{% include "partials/wordmark.njk" %}`.

- [ ] **Step 1: Load the `typographic-poster` skill** and pick the paper/ink/spot values from the captured artwork; verify ink-on-paper and spot-on-paper contrast ratios meet Global Constraints (record values in a comment in `tokens.css`).
- [ ] **Step 2: Build home page**: wordmark as image, featured release (newest), latest 3 news, free download block, socials.
- [ ] **Step 3: Run** `npm test` → PASS (build still green); `npm run serve`, preview `/` at 1440px and 375px in the in-app browser, screenshot both.
- [ ] **Step 4: STOP — show screenshots to the user; iterate until approved.** Do not start Task 5 before approval.
- [ ] **Step 5: Commit** `feat: poster-archive design system and home page`.

### Task 5: Remaining pages and click-to-load player

**Files:**
- Create: `src/{releases,singles,artists,events,videos,label,404}.njk`, `src/news/index.njk`, `src/_includes/layouts/post.njk`, `src/_includes/partials/player.njk`, `src/assets/js/player.js`, `scripts/check-overflow.mjs`, `tests/pages.test.mjs`; Modify: `eleventy.config.mjs` (register `player` shortcode)

**Interfaces:**
- Consumes: data files (Task 3), tokens/partials (Task 4).
- Produces: shortcode `player(provider, id, url, title?, poster?)` → `<figure class="player" data-provider data-id>` with poster (or typographic placeholder), a `<button>` "Play", and a fallback `<a href="{url}">` to the service. `player.js` swaps the figure for the provider iframe on click (YouTube via `youtube-nocookie.com`). Events page renders "No upcoming shows" state when `events` is empty.

- [ ] **Step 1: Write failing tests** `tests/pages.test.mjs` (build once): each of `/releases/ /singles/ /artists/ /events/ /videos/ /news/ /label/ /404.html` exists; `/videos/index.html` has 10 `.player` figures each containing an `<a href` to youtube.com/vimeo.com; no built HTML contains `<iframe`; `/label/` contains `mailto:cslsx.is.real@gmail.com`; `/artists/` contains `SPIN`; `/events/` contains `No upcoming shows`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the pages, shortcode and `player.js`.
- [ ] **Step 4: Implement** `check-overflow.mjs`: Playwright Chromium against `_site/` served by a static server, for every built page at 320×640 and 375×812, asserts `document.documentElement.scrollWidth <= innerWidth`; exit 1 listing offenders. Add to `npm test` via `tests/overflow.test.mjs`.
- [ ] **Step 5: Run** `npx playwright install chromium && npm test` → PASS.
- [ ] **Step 6: Preview** every page at 1440px and 375px in the in-app browser; click a video player and confirm the embed loads.
- [ ] **Step 7: Commit** `feat: build remaining pages and click-to-load players`.

### Task 6: Redirect stubs, link check and content coverage

**Files:**
- Create: `src/redirects.njk`, `src/_data/redirects.json`, `scripts/check-links.mjs`, `scripts/check-content.mjs`, `tests/integrity.test.mjs`

**Interfaces:**
- Consumes: `capture/manifest.json` (Task 2), built `_site/`.
- Produces: paginated `redirects.njk` over `redirects.json` (`[{from,to}]` per Global Constraints) emitting `<meta http-equiv="refresh" content="0; url={to}">`, `<link rel="canonical" href="https://cslsx.com{to}">`, and a visible link. `check-links.mjs` exports `findBrokenLinks(siteDir): string[]` (internal `href`/`src` that don't resolve to a file). `check-content.mjs` exports `findMissingContent(siteDir, manifest): string[]` (manifest `texts` not found — whitespace-normalized, case-insensitive — in any built page, plus manifest images not referenced anywhere).

- [ ] **Step 1: Write failing tests** `tests/integrity.test.mjs`: `findBrokenLinks('_site')` → `[]`; `findMissingContent('_site', manifest)` → `[]`; every redirect `from` has `_site/<from>/index.html` containing its `to`; every news `fullUrl` from the manifest resolves to `_site/<fullUrl>/index.html`; no built file contains `squarespace`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** redirects and both check modules; fix any content the coverage check reports missing (or remove the text from `manifest.texts` with a one-line reason in `capture/EXCLUDED.md` if it is template boilerplate, e.g. "Upcoming Events").
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: add redirects and integrity checks`.

### Task 7: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `src/CNAME` (`cslsx.com`), `docs/DNS-CUTOVER.md`, `README.md`

**Interfaces:**
- Consumes: `npm ci && npm test && npm run build`.
- Produces: workflow on push to `main`: checkout → setup-node 24 → `npm ci` → `npx playwright install --with-deps chromium` → `npm test` → `upload-pages-artifact` (`_site`) → `deploy-pages@v4`; permissions `pages: write`, `id-token: write`.

- [ ] **Step 1: Write** workflow, `README.md` (how to add a news post: copy a `.md` in `src/news/`, set front matter, push), and `docs/DNS-CUTOVER.md` with GoDaddy steps: delete the Squarespace A records (198.185.159.144/145, 198.49.23.144/145) and `www` CNAME; add apex A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; add `www` CNAME → `clalburn1420.github.io`; then enable "Enforce HTTPS" in repo Pages settings once the cert issues.
- [ ] **Step 2: Hold `src/CNAME` out of the first deploy** (comment the passthrough) so the site can be verified at `https://clalburn1420.github.io/CSLSX/` — set Eleventy `pathPrefix` to `/CSLSX/` via env `PATH_PREFIX` in the workflow and use the `url` filter on all internal links.
- [ ] **Step 3: Create repo and push:** `gh repo create clalburn1420/CSLSX --public --source . --push`; `gh api -X POST repos/clalburn1420/CSLSX/pages -f build_type=workflow`.
- [ ] **Step 4: Verify:** `gh run watch` → success; load `https://clalburn1420.github.io/CSLSX/` and two inner pages in the in-app browser.
- [ ] **Step 5: Enable custom domain:** restore `CNAME` passthrough, drop `PATH_PREFIX`, `gh api -X PUT repos/clalburn1420/CSLSX/pages -f cname=cslsx.com`, push, confirm run succeeds.
- [ ] **Step 6: Hand the DNS cutover to the user** (they edit GoDaddy); after they confirm, check `https://cslsx.com` serves the new site and enable HTTPS enforcement.
- [ ] **Step 7: Commit** each change above with its own message (`ci: deploy to GitHub Pages`, `feat: serve on cslsx.com`).
