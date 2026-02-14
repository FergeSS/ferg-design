import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;

const preferredPorts = [3000, 3001, 5173, 8080, 4173, 5000];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "0.0.0.0");
  });
}

async function pickPort() {
  for (const port of preferredPorts) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) {
      return port;
    }
  }

  let dynamicPort = 5001;
  while (!(await isPortFree(dynamicPort))) {
    dynamicPort += 1;
  }
  return dynamicPort;
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const trimmed = decoded.replace(/^\/+/, "");
  const normalized = path.normalize(trimmed);
  const resolved = path.resolve(root, normalized);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }

  return resolved;
}

async function serveFile(targetPath, res) {
  try {
    const stats = await fs.stat(targetPath);
    let filePath = targetPath;

    if (stats.isDirectory()) {
      filePath = path.join(targetPath, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const body = await fs.readFile(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  const requestPath = req.url === "/" ? "index.html" : req.url;
  const target = safePath(requestPath || "/index.html");

  if (!target) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  await serveFile(target, res);
});

const port = await pickPort();

server.listen(port, "0.0.0.0", () => {
  console.log(`Portfolio available at http://localhost:${port}`);
  console.log(`Checked ports: ${preferredPorts.join(", ")} (used fallback if occupied).`);
});
