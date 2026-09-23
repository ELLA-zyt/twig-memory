import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync } from 'node:fs';

// Configuration stays on the server; never interpolate it into the page.
let backend;
try {
  backend = new URL(process.env.BACKEND_URL || '');
  if (!['http:', 'https:'].includes(backend.protocol) || backend.username ||
      backend.password || backend.pathname !== '/' || backend.search || backend.hash) {
    throw new Error();
  }
} catch {
  console.error('BACKEND_URL must be an http(s) origin without credentials, path, query or fragment.');
  process.exit(1);
}

const port = Number(process.env.PORT || 8080);
const timeoutMs = Number(process.env.PROXY_TIMEOUT_MS || 120000);
if (!Number.isInteger(port) || port < 1 || port > 65535 ||
    !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) {
  console.error('Invalid PORT or PROXY_TIMEOUT_MS.');
  process.exit(1);
}
const page = readFileSync(new URL('./index.html', import.meta.url));
const hopHeaders = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function endToEndHeaders(headers) {
  const excluded = new Set(hopHeaders);
  for (const name of String(headers.connection || '').split(',')) {
    excluded.add(name.trim().toLowerCase());
  }
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !excluded.has(name)));
}

function json(res, status, error) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error }));
}

createServer((req, res) => {
  // Require origin-form paths. The browser cannot choose a proxy destination.
  const rawPath = req.url || '/';
  const pathname = rawPath.split('?')[0];
  if (pathname.startsWith('/v1/')) {
    const headers = endToEndHeaders(req.headers);
    headers.host = backend.host;
    const request = backend.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstream = request(backend, { method: req.method, path: rawPath, headers });
    let upstreamResponse;
    let settled = false;
    const fail = (status, message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      upstream.destroy();
      upstreamResponse?.destroy();
      if (res.destroyed) return;
      if (res.headersSent) res.destroy();
      else json(res, status, message);
    };
    const timer = setTimeout(() => fail(504, 'Backend request timed out'), timeoutMs);
    upstream.on('error', () => fail(502, 'Backend unavailable'));
    upstream.on('response', (response) => {
      upstreamResponse = response;
      if (settled) { response.destroy(); return; }
      response.on('error', () => fail(502, 'Backend response interrupted'));
      response.on('aborted', () => fail(502, 'Backend response interrupted'));
      // Node's request API does not follow redirects, so credentials stay at BACKEND_URL.
      res.writeHead(response.statusCode || 502, {
        ...endToEndHeaders(response.headers), 'cache-control': 'no-store',
      });
      response.pipe(res);
    });
    res.on('finish', () => { settled = true; clearTimeout(timer); });
    res.on('close', () => {
      settled = true;
      clearTimeout(timer);
      upstream.destroy();
      upstreamResponse?.destroy();
    });
    req.on('aborted', () => fail(400, 'Request interrupted'));
    req.on('error', () => fail(400, 'Request interrupted'));
    req.pipe(upstream);
    return;
  }
  if (pathname === '/' || pathname === '/index.html') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return json(res, 405, 'Method not allowed');
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': page.length,
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : page);
    return;
  }
  json(res, 404, 'Not found');
}).listen(port, '0.0.0.0', () => {
  console.log(`Starmap listening on port ${port}`);
});
