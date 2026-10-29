// Serves a built frontend for the end-to-end tests, as the nginx image does in production:
// files as they are, and index.html for every other path (the apps route in the browser).
//   node static-server.mjs <folder> <port>
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

class StaticServer {
  static TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.webmanifest': 'application/manifest+json',
  };

  constructor(root, port) {
    this.root = root;
    this.port = port;
  }

  listen() {
    createServer((request, response) => this.serve(request, response)).listen(
      this.port,
      '127.0.0.1',
    );
  }

  serve(request, response) {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    const file = this.isFile(join(this.root, path))
      ? join(this.root, path)
      : join(this.root, 'index.html');
    const type = StaticServer.TYPES[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(response);
  }

  isFile(path) {
    try {
      return path.startsWith(this.root) && statSync(path).isFile();
    } catch {
      return false;
    }
  }
}

new StaticServer(process.argv[2], Number(process.argv[3])).listen();
