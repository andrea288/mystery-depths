import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(import.meta.dirname, "..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".xml": "application/xml",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const decoded = decodeURIComponent(url.pathname);
      if (
        decoded.split("/").some((p) => p.startsWith(".")) ||
        !/^\/(?:$|index.html$|style.css$|src\/|assets\/)/.test(decoded)
      )
        throw Error();
      const file = resolve(
        root,
        "." + (decoded === "/" ? "/index.html" : decoded),
      );
      if (!file.startsWith(root + sep) || !(await stat(file)).isFile())
        throw Error();
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("Non trovato");
    }
  })
  .listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
    console.log(
      "Mystery Depths: http://127.0.0.1:" + (process.env.PORT || 4173),
    ),
  );
