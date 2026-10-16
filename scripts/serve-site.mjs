// Minimal static server for the built site, used by the browser checks.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg" };

/** Serves dir on a free port; resolves to the http.Server (read .address().port). */
export function serve(root) {
  const server = createServer(async (req, res) => {
    let p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    try {
      if ((await stat(p)).isDirectory()) p = join(p, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
      res.end(await readFile(p));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}
