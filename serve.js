// serve.js - MagicWeb v3.2 Hypervisor Server
// Enforces 2026 WebAssembly Cross-Origin Isolation (COOP, COEP, CORP)

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  // Mandatory 2026 WASM Cross-Origin Isolation Headers
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const cleanUrl = req.url.split("?")[0];
  let relativePath = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\//, "");
  let filePath = path.join(__dirname, relativePath);

  // Service Worker Root Registration Scope
  if (cleanUrl.endsWith("sw.js")) {
    res.setHeader("Service-Worker-Allowed", "/");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback for virtual port paths before SW claims
      if (cleanUrl.startsWith("/service/")) {
        fs.readFile(path.join(__dirname, "index.html"), (errHtml, dataHtml) => {
          if (!errHtml) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(dataHtml);
            return;
          }
        });
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`404 Not Found: ${cleanUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[MagicWeb v3.2] Hypervisor server running on http://localhost:${PORT}/`);
  console.log(`Cross-Origin Isolation: ENABLED (COOP: same-origin, COEP: credentialless)`);
});
