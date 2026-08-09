import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDir = path.resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const indexFile = path.join(distDir, "index.html");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(request, response, filePath) {
  return stat(filePath).then((fileStat) => {
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": filePath.includes(`${path.sep}assets${path.sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  });
}

function resolveStaticPath(pathname) {
  const normalized = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(distDir, normalized);
  return candidate.startsWith(distDir) ? candidate : null;
}

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/health")) {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const staticPath = resolveStaticPath(requestUrl.pathname);

    if (staticPath) {
      try {
        const fileStat = await stat(staticPath);
        if (fileStat.isFile()) {
          await sendFile(request, response, staticPath);
          return;
        }
      } catch {
        if (path.extname(staticPath)) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }
      }
    }

    await sendFile(request, response, indexFile);
  } catch (error) {
    console.error("[landing-static-server] request failed", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
});

server.listen(port, host, () => {
  console.log(`[landing-static-server] serving ${distDir} on ${host}:${port}`);
});
