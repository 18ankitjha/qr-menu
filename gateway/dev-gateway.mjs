// ============================================================
// Dev Gateway — one host for every app, like the production reverse proxy
//
//   http://localhost:8080/admin/...        → restaurant admin  (Vite :5173)
//   http://localhost:8080/menu/...         → customer menu     (Vite :5174)
//   http://localhost:8080/kitchen/...      → kitchen board     (Vite :5175)
//   http://localhost:8080/super-admin/...  → super admin       (Vite :5176)
//   http://localhost:8080/api/...          → API server        (:5001)
//   http://localhost:8080/socket.io/...    → API server        (:5001, WebSocket)
//
// Local development only. In production, Nginx/Caddy serves the built apps the same way.
// ============================================================

import http from 'node:http';
import httpProxy from 'http-proxy';

const PORT = Number(process.env.GATEWAY_PORT) || 8080;
const HOST = '0.0.0.0'; // reachable from a phone on the same Wi-Fi (for scanning QR codes)

const API = 'http://localhost:5001';

/** First matching prefix wins. `app` routes are front-ends served under their own base path. */
const ROUTES = [
  { prefix: '/api', target: API, name: 'API server', start: 'npm run dev:server' },
  { prefix: '/socket.io', target: API, name: 'API server', start: 'npm run dev:server' },
  { prefix: '/health', target: API, name: 'API server', start: 'npm run dev:server' },
  { prefix: '/super-admin', target: 'http://localhost:5176', name: 'Super admin', start: 'npm run dev:super-admin', app: true },
  { prefix: '/admin', target: 'http://localhost:5173', name: 'Restaurant admin', start: 'npm run dev:admin', app: true },
  { prefix: '/kitchen', target: 'http://localhost:5175', name: 'Kitchen board', start: 'npm run dev:kitchen', app: true },
  { prefix: '/menu', target: 'http://localhost:5174', name: 'Customer menu', start: 'npm run dev:menu', app: true },
];

const matchRoute = (url = '/') => {
  const path = url.split('?')[0];
  return ROUTES.find((route) => path === route.prefix || path.startsWith(`${route.prefix}/`));
};

const proxy = httpProxy.createProxyServer({ xfwd: true });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title>
<style>*{box-sizing:border-box}body{font-family:system-ui,sans-serif;max-width:820px;margin:48px auto;padding:0 16px;color:#111}
a{color:#6d28d9}li{margin:8px 0}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f9fafb}h2{margin-top:32px}
@media (max-width:600px){body{margin:24px auto;font-size:15px;overflow-wrap:anywhere}h1{font-size:24px}h2{font-size:19px;margin-top:24px}
table,tbody,tr,td{display:block;width:100%}tr:first-child{display:none}
tr{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:12px}td{border:none;padding:4px 0}td:first-child{font-weight:700}}</style></head>
<body>${body}</body></html>`;

const landingPage = () =>
  page(
    'QR Menu — local',
    `<h1>QR Menu — local dev</h1>
<h2>Who logs in where</h2>
<table>
<tr><th>Role</th><th>Open</th><th>Sign in with</th></tr>
<tr><td>Restaurant owner</td><td><a href="/admin/login">/admin/login</a></td><td>Google</td></tr>
<tr><td><strong>Waiter</strong></td><td><a href="/admin/login">/admin/login</a> → “Waiter login”</td>
<td>Restaurant code (6 digits) + username + PIN — the owner finds all three on <em>Admin → Staff</em>
(and can share <code>/admin/login?code=&lt;restaurantCode&gt;</code> to prefill the code)</td></tr>
<tr><td>Super admin</td><td><a href="/super-admin/">/super-admin/</a></td><td>Google (email in <code>SUPER_ADMIN_EMAILS</code>)</td></tr>
<tr><td>Kitchen</td><td><code>/kitchen/?restaurant=&lt;restaurantId&gt;</code></td><td>no login (yet)</td></tr>
<tr><td>Customer</td><td><code>/menu/t/&lt;qrToken&gt;</code></td><td>scan the table QR (or Admin → Tables → Open menu); Google sign-in to order</td></tr>
</table>
<h2>Apps</h2><ul>
${ROUTES.filter((r) => r.app)
  .map((r) => `<li><a href="${r.prefix}/">${r.prefix}/</a> — ${escapeHtml(r.name)}</li>`)
  .join('\n')}
<li><a href="/health">/health</a> — API health check</li></ul>`
  );

proxy.on('error', (error, req, res) => {
  const route = matchRoute(req.url);
  // WebSocket upgrades hand us a raw socket instead of a response
  if (!res || typeof res.writeHead !== 'function') {
    res?.destroy?.();
    return;
  }
  if (res.headersSent) {
    res.end();
    return;
  }
  res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    page(
      'Not running',
      `<h1>${escapeHtml(route?.name ?? 'Upstream')} is not running</h1>
<p>Start it from the repo root with <code>${escapeHtml(route?.start ?? 'npm run dev')}</code>.</p>
<p style="color:#6b7280">${escapeHtml(error.code ?? error.message)}</p>`
    )
  );
});

const server = http.createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0];

  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(landingPage());
    return;
  }

  const route = matchRoute(req.url);
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page('Not found', `<h1>Not found</h1><p><a href="/">See available apps</a></p>`));
    return;
  }

  // Apps are served under "<prefix>/" — add the trailing slash so relative asset URLs resolve
  if (route.app && path === route.prefix) {
    const query = req.url.slice(path.length);
    res.writeHead(301, { Location: `${route.prefix}/${query}` });
    res.end();
    return;
  }

  proxy.web(req, res, { target: route.target });
});

// WebSockets: Socket.IO (API) and Vite hot reload (apps)
server.on('upgrade', (req, socket, head) => {
  const route = matchRoute(req.url);
  if (!route) {
    socket.destroy();
    return;
  }
  proxy.ws(req, socket, head, { target: route.target });
});

server.listen(PORT, HOST, () => {
  console.log(`QR Menu dev gateway → http://localhost:${PORT}`);
  for (const route of ROUTES) {
    console.log(`  ${route.prefix.padEnd(13)} → ${route.target}  (${route.name})`);
  }
});
