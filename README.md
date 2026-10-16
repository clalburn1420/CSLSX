# CSLSX

The archive site for CSLSX, served at [cslsx.com](https://cslsx.com). It replaced the old
Squarespace site in October 2026. Built with [Eleventy](https://www.11ty.dev/) and deployed
to GitHub Pages on every push to `main`.

## Run it locally

```bash
npm install
npm run serve
```

Then open http://localhost:8080.

```bash
npm test
```

`npm test` builds the site and checks the content and data, broken links, that nothing from
the old site went missing, and that no page scrolls sideways on a phone. The first run
needs `npx playwright install chromium`.

## Add a news post

1. Copy any file in `src/news/` to a new name, such as `src/news/new-single.md`.
2. Edit the front matter at the top:

   ```yaml
   ---
   title: "New single out now"
   date: 2026-11-01
   permalink: /news/2026/11/1/new-single/
   image: /assets/img/your-image.webp   # optional
   ---
   ```

3. Write the post below the front matter in Markdown. To embed a track or video, add a
   player on its own line:

   ```
   {% player "youtube", "VIDEO_ID", "https://www.youtube.com/watch?v=VIDEO_ID" %}
   {% player "spotify", "album/ALBUM_ID", "https://open.spotify.com/album/ALBUM_ID" %}
   ```

4. Commit and push to `main`. The site redeploys in about two minutes.

## Where things live

| What | Where |
|---|---|
| Releases, music, videos, bio, events, links | `src/_data/*.json` |
| News posts | `src/news/*.md` |
| Page templates | `src/*.njk`, `src/_includes/` |
| Design (colors, type, layout) | `src/assets/css/` (`tokens.css` holds the palette and type scale) |
| Images | `src/assets/img/` (WebP) |
| Original Squarespace capture | `capture/` (kept as a record; `scripts/capture.mjs` made it) |

To list a show, add it to `src/_data/events.json`:
`[{ "date": "2027-03-14", "venue": "Johnny Brenda's", "city": "Philadelphia" }]`.

## Hosting

GitHub Pages, deployed by `.github/workflows/deploy.yml`. DNS is at GoDaddy; see
[docs/DNS-CUTOVER.md](docs/DNS-CUTOVER.md).
