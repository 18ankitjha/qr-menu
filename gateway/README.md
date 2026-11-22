# Dev gateway — one host, one path per app

Every front-end is its own app (separate bundle, separate deploy), but they all live under **one host**,
each on its own path — locally and in production:

| Path | App | Dev server |
|---|---|---|
| `/admin/` | Restaurant admin (`/admin/menu`, `/admin/tables`, …) | Vite :5173 |
| `/menu/<restaurantId>/<tableId>` | Customer menu (what a table QR code opens) | Vite :5174 |
| `/kitchen/?restaurant=<restaurantId>` | Kitchen board | Vite :5175 |
| `/super-admin/` | Platform super admin (`/super-admin/restaurants`, …) | Vite :5176 |
| `/api/v1/...`, `/socket.io/` | API server + real-time | Express :5001 |

## Run everything locally

```bash
npm run install:all   # once
npm run dev           # API + 4 apps + this gateway
```

Open **http://localhost:8080** — the landing page links to every app.

`dev-gateway.mjs` is a tiny `http-proxy` server that routes by path prefix (HTTP and WebSockets, so
Socket.IO and Vite hot reload both work). Each Vite app has `base: '/<app>/'` and also proxies `/api`, so
`http://localhost:5176/super-admin/` still works on its own.

To test QR codes from a phone, use your LAN IP in `QR_BASE_URL` / `CLIENT_MENU_URL`
(e.g. `http://192.168.1.20:8080`) — the gateway listens on all interfaces.

## Production on Render (current setup — one service)

`render.yaml` (repo root) deploys everything as **one** Node web service: `npm run build` installs and builds the
server + the four apps, then `npm start` runs the API, which also serves `client/<app>/dist` under `/admin/`,
`/menu/`, `/kitchen/`, `/super-admin/` and a landing page at `/` (`server/src/services/web-apps/`, only when
`NODE_ENV=production`). Same paths as the dev gateway, so cookies, Socket.IO and QR links need no extra config.

App URLs, `QR_BASE_URL` and `GOOGLE_CALLBACK_URL` default to `PUBLIC_URL` → Render's `RENDER_EXTERNAL_URL`
(e.g. `https://qr-menu.onrender.com`). Register `<that URL>/api/v1/auth/google/callback` in Google Cloud Console,
allow `0.0.0.0/0` in MongoDB Atlas → Network Access, and regenerate table QRs after the first deploy (old ones
encode the previous host). Free plan sleeps after ~15 min idle (first request then takes ~50 s).

## Production (example: Nginx)

Build each app (`npm run build` → `client/<app>/dist`) and serve the folders under their paths; the API
runs behind the same host.

```nginx
server {
  server_name qrmenu.example.com;

  location /api/       { proxy_pass http://127.0.0.1:5001; }
  location /socket.io/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  # Single-page apps: unknown paths fall back to that app's index.html
  location /super-admin/ { alias /srv/qr-menu/super-admin/; try_files $uri $uri/ /super-admin/index.html; }
  location /admin/       { alias /srv/qr-menu/admin/;       try_files $uri $uri/ /admin/index.html; }
  location /kitchen/     { alias /srv/qr-menu/kitchen/;     try_files $uri $uri/ /kitchen/index.html; }
  location /menu/        { alias /srv/qr-menu/menu/;        try_files $uri $uri/ /menu/index.html; }
}
```

Matching server env (`.env`):

```
CLIENT_ADMIN_URL=https://qrmenu.example.com/admin
CLIENT_MENU_URL=https://qrmenu.example.com/menu
CLIENT_KITCHEN_URL=https://qrmenu.example.com/kitchen
CLIENT_SUPER_ADMIN_URL=https://qrmenu.example.com/super-admin
QR_BASE_URL=https://qrmenu.example.com
GOOGLE_CALLBACK_URL=https://qrmenu.example.com/api/v1/auth/google/callback   # also add it in Google Cloud Console
```

Locally, `GOOGLE_CALLBACK_URL` stays `http://localhost:5001/api/v1/auth/google/callback` (already registered
with Google); the login cookie is set for `localhost`, so it is also sent to `localhost:8080`.
