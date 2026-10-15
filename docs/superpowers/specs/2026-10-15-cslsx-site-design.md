# CSLSX site — self-hosted redesign

Date: 2026-10-15
Status: approved in conversation, awaiting spec review

## Goal

Move cslsx.com off Squarespace onto a self-hosted static site, and redesign it.
The site is an **archive / portfolio** for the band CSLSX (Andrew Alburn, Chad Alburn,
Jesse Davis): a permanent, good-looking home for the catalog, videos, bio and news.
Updates will be rare, so the build optimizes for zero upkeep and no third-party
dependencies, while keeping "add a news post" a one-file change.

Success means:

- Every piece of real content on the live site exists on the new site; nothing depends
  on Squarespace (images included).
- Existing news-post URLs keep working.
- The site reads as a deliberate poster-archive design, not a template.
- It is served from GitHub Pages at cslsx.com over HTTPS.

## Decisions (from the user)

| Topic | Decision |
|---|---|
| Purpose | Archive / portfolio |
| Store | No cart. Releases link out to streaming services; free download stays a direct file |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Repo | New public repo `github.com/clalburn1420/CSLSX` (can be transferred to halffieldscience later) |
| Aesthetic | "Poster archive" — Swiss/contemporary poster language, via the `typographic-poster` skill |
| Contact | Large mailto link to cslsx.is.real@gmail.com; no form service |
| Dropped pages | `/mixes` (template lorem ipsum), `/main`, `/home-wav` (empty index leftovers), `/cart` |
| Kept | Events, even though it is currently empty |

## Stack

- **Eleventy (11ty)** static site generator, Nunjucks layouts, Markdown news posts.
- Output is plain HTML + CSS; JavaScript only where it earns its place (click-to-load
  video embeds, mobile nav toggle). No client framework.
- **Archivo** (variable: width + weight axes), self-hosted woff2, replacing the Adobe-only
  Futura PT / Runda.
- Images converted to WebP at sensible max widths with `sharp` at capture time; originals
  are not committed.
- GitHub Actions workflow builds on push to `main` and deploys with
  `actions/deploy-pages`.

## Pages and URLs

| URL | Source on live site | Content |
|---|---|---|
| `/` | home | Wordmark as image, featured release, latest news, free *Keep On Shining* download |
| `/releases/` | releases (products) | *Ritualize* (CSLSX & Lushlife) and other releases; streaming links instead of cart |
| `/singles/` | singles ("Music") | Releases/singles with embedded players |
| `/artists/` | artists ("Bio") | Bio copy incl. SPIN quote |
| `/events/` | events | Designed "no upcoming shows" state; data file ready for past shows |
| `/videos/` | videos | Click-to-load YouTube/Vimeo embeds |
| `/news/` | news | Index of all posts |
| `/news/YYYY/M/D/slug/` | news posts | All 7 posts, same paths as Squarespace |
| `/label/` | label ("Contact") | Big mailto + social links |

Nav labels stay as on the live site (Releases, Music, Bio, Events, Videos, News, Contact);
the underlying paths are kept so inbound links still resolve. The release product URL
(`/releases/x310ryvv25xgpl6izwro0dy3swrxg9`), `/cart`, `/mixes`, `/main` and `/home-wav`
get small redirect pages (meta refresh + canonical) to the nearest live page, since
GitHub Pages has no server-side redirects.

Social links carried over: SoundCloud, Apple Music, Spotify, Facebook, Instagram, Vimeo,
YouTube, Twitter, email.

## Visual direction — "poster archive"

- Paper-tone background (off-white) and two spot inks drawn from the artwork: a deep ink
  for text and one hot accent descended from the current pink.
- Archivo used across its width/weight range; the CSLSX wordmark set huge and treated as
  image, with violent scale contrast against small, tightly tracked body and labels.
- Strict column grid; each page composed as a single committed idea rather than stacked
  template sections.
- Sculpture/photography (Belvedere Apollo, Sugimoto, Eric Petersen artwork) given a
  halftone or riso-grain treatment, done in CSS/SVG filters so originals stay intact.
- Responsive down to 320px with a 16px gutter; no horizontal scroll; honors
  `prefers-reduced-motion`; text contrast meets WCAG AA.
- A home-page mockup is shown to the user for sign-off before the remaining pages are built.

## Content capture

A Node script (`scripts/capture.mjs`) reads each page via Squarespace's `?format=json`
export and writes:

- `src/_data/*.json` for structured data (releases, links, videos),
- `src/news/*.md` for posts (front matter: title, date, original URL),
- page copy into the corresponding templates' data,
- every referenced image from `images.squarespace-cdn.com` at full resolution, converted to
  WebP into `src/assets/img/`.

The free download (*Keep On Shining*) is downloaded and committed if it is a hosted file; if
it points elsewhere, the link is kept.

Capture runs once; the output is committed and edited by hand from then on.

## Hosting and cutover

1. Create `clalburn1420/CSLSX` (public), push, enable Pages with source "GitHub Actions".
2. Verify on the `*.github.io` URL.
3. Add `CNAME` (cslsx.com) and give the user the GoDaddy DNS changes: apex A records to
   GitHub Pages' four IPs, `www` CNAME to `clalburn1420.github.io`. The user makes the
   DNS edit; the Squarespace site keeps serving until then.
4. Enable "Enforce HTTPS" once the certificate is issued.

## Verification

- Preview every page in the in-app browser at desktop and 375px widths.
- Automated internal link check over the built `_site/`.
- Content diff: a script lists every text block and image from the capture and confirms
  each appears in the built output.

## Out of scope

Store/checkout, contact form service, CMS/admin UI, analytics, new content writing.
