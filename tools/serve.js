// Kleiner statischer Server zum lokalen Testen (Service Worker brauchen http://localhost).
// Aufruf: node tools/serve.js  →  http://localhost:8080
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const port = +process.env.PORT || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".json": "application/json", ".png": "image/png", ".md": "text/plain; charset=utf-8",
  ".mp4": "video/mp4"
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("Nicht gefunden"); }
    const headers = { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "Accept-Ranges": "bytes" };
    // Range-Anfragen, damit Videos sich spulen lassen
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] ? +m[1] : st.size - +m[2], end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, "Content-Length": st.size });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log("http://localhost:" + port));
