// Tiny static server for the offline mirror (SPA fallback to /index.html)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'site');
const port = Number(process.argv[3] || 3000);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.gif':'image/gif',
  '.ico':'image/x-icon', '.woff2':'font/woff2', '.woff':'font/woff', '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.mp4':'video/mp4', '.pdf':'application/pdf', '.xml':'application/xml' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) {
    if (path.extname(p) && path.extname(p) !== '.html') { res.writeHead(404); return res.end(); }
    f = path.join(root, 'index.html');
  }
  const range = req.headers.range, stat = fs.statSync(f), type = types[path.extname(f)] || 'application/octet-stream';
  if (range) {
    const [s, e] = range.replace('bytes=', '').split('-'); const start = +s, end = e ? +e : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return fs.createReadStream(f, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`VSTEP offline: http://localhost:${port}`));
