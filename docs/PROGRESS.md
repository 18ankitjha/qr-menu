# QR Menu — Project Progress & Context

> Living handoff document: what exists, what was done, what is planned, and how to run it.
> Keep it updated at the end of each work session. **Last updated: 22 Nov 2026.**
>
> Related docs: [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) (target design + roadmap) ·
> [SERVICE_BOUNDARIES.md](./SERVICE_BOUNDARIES.md) (microservice split, data ownership) ·
> [../gateway/README.md](../gateway/README.md) (one-host setup + production Nginx) ·
> [../PLAN](../PLAN) (original v2 plan).

---

## 1. Product in one paragraph

Restaurant order management via QR codes. A customer scans the QR on their table, opens the
restaurant's menu in the browser, adds items and places orders. The kitchen sees orders in real time
and moves them through statuses. The restaurant admin manages menu, dishes, discounts, tables/QRs,
waiters, orders and bills. A **super admin** (the founders: 1–2 people) onboards restaurants:
approve, reject, suspend, reactivate.

---

## 2. Tech stack & repo layout

| Layer | Tech |
|---|---|
| API | Node + Express + TypeScript, Mongoose (MongoDB Atlas), zod validation, Socket.IO, pdfkit, qrcode |
| Auth | Google OAuth → JWT in an httpOnly `token` cookie (also accepts `Authorization: Bearer`) |
| Images | Cloudinary (Mongo stores URLs only) |
| Front-ends | React 19 + Vite + TypeScript, vanilla CSS, axios, react-router |

```
qr-menu/
├── server/                  API (routes → validators → controllers → dm/* → MongoDB)
│   └── src/
│       ├── services/<service>/  one folder per service, named after what it does:
│       │     auth · restaurant · menu · table · order · billing · staff · upload · realtime · super-admin
│       │     each has routes/ controllers/ validators/ dm/ (model + DB functions) interfaces/ constants/ index.ts
│       ├── routes/index.ts  mounts every service under /api/v1/<service>
│       ├── config/ middlewares/ interfaces/ utils/   shared plumbing only
│       └── seed.ts          ⚠️ WIPES ALL COLLECTIONS — never run against the shared cluster
├── client/
│   ├── admin/               restaurant admin      → served at /admin/
│   ├── menu/                customer menu         → served at /menu/t/<qrToken>  (what the table QR opens)
│   ├── kitchen/             kitchen board         → served at /kitchen/?restaurant=<id>
│   └── super-admin/         platform super admin  → served at /super-admin/   (NEW)
├── gateway/                 dev gateway: one host (:8080) routes paths to each app + API   (NEW)
├── docs/                    SYSTEM_DESIGN.md, SERVICE_BOUNDARIES.md, PROGRESS.md   (NEW)
├── .env                     real config (gitignored): Atlas URI, Google, Cloudinary, SUPER_ADMIN_EMAILS
└── PLAN                     original plan (v2)
```

Code conventions (from the original brief): TypeScript everywhere, constants files (no magic strings),
separate `interfaces/` folder, one file per API area, controllers call the **DM layer** (never models),
zod validation on every input.

---

## 3. How to run (local)

```bash
npm run install:all      # once (server, 4 apps, gateway)
npm run dev              # API + admin + menu + kitchen + super-admin + gateway
```

Open **http://localhost:8080** (landing page links every app).

| URL | What |
|---|---|
| `http://localhost:8080/super-admin/` | Super admin (Google login with an allowlisted email) |
| `http://localhost:8080/admin/` | Restaurant admin — owner (Google) or waiter (restaurant code + username + PIN). Pages: `/admin/menu`, `/admin/tables`, `/admin/orders`, `/admin/bills`, `/admin/staff`, `/admin/restaurant` |
| `http://localhost:8080/menu/t/<qrToken>` | Customer menu (what QR codes open; get the link from **Tables → Open menu**). Old `/menu/<restaurantId>/<tableId>` links still work for tables whose QR was never regenerated |
| `http://localhost:8080/kitchen/?restaurant=<restaurantId>` | Kitchen board |
| `http://localhost:8080/api/v1/...` · `/health` | API |

Dev servers behind the gateway: API :5001, admin :5173, menu :5174, kitchen :5175, super-admin :5176.
Each app also works on its own port under its base path (e.g. `http://localhost:5176/super-admin/`).

**Config:** the server loads `server/.env` first, then falls back to the **repo-root `.env`** (the real one).
Key non-secret values:

```
PORT=5001
CLIENT_ADMIN_URL=http://localhost:8080/admin
CLIENT_SUPER_ADMIN_URL=http://localhost:8080/super-admin
CLIENT_MENU_URL / CLIENT_KITCHEN_URL / QR_BASE_URL = http://192.168.31.101:8080[/menu|/kitchen]   (LAN IP for phone testing)
GOOGLE_CALLBACK_URL=http://localhost:5001/api/v1/auth/google/callback   (registered in Google Console)
SUPER_ADMIN_EMAILS=<the two founders' Google emails — see root .env>
```

**Database:** MongoDB Atlas cluster, database `test`. As of this session it holds 3 real restaurants
(created before onboarding approval existed → no `status` field → treated as ACTIVE), 3 users, 12 tables,
29 dishes, 9 orders.

---

## 4. Status at a glance

Legend: ✅ done · 🟨 partial · ❌ not started

| Area | Status | Notes |
|---|---|---|
| Restaurant register + GPS | ✅ | New registrations start `PENDING_APPROVAL` |
| Menu, categories, dishes, theme, images | ✅ | Dishes now have spice level, serving size, calories, ingredients, allergens |
| Per-dish discount / strikethrough | ❌ | Phase 2 |
| Tables (single/bulk) + QR generation | ✅ | QR generated automatically on create; encodes `/menu/t/<qrToken>` (random, rotatable) |
| **Waiter / owner takes an order for a table** | ✅ | `POST /order/placeByStaff`, `placedBy` on order |
| **Sequential Quick Setup + locked sidebar** | ✅ | `GET /setup/getStatus/:restaurantId` |
| **Invalidate / rotate table QR** | ✅ | Owner "Regenerate QR" — old QR stops working |
| Orders: place, status machine, kitchen view, admin view | ✅ | Kitchen board is read-only and has no login |
| Orders of the table's current customer (since its last bill) + unbilled count/amount | ✅ | `GET /order/getByTable/:tableId` |
| Real-time kitchen updates (Socket.IO) | ✅ | |
| Single-order invoice PDF | ✅ | `GET /billing/getOrderPdf/:orderId` |
| **Customer: Google login, shared live table cart, place order, view bill** | ✅ | `/api/v1/table-session/*`, see §6c |
| **Table sessions (one per seated party, closed by the bill)** | ✅ | Idle sessions close after 4 h with nothing unbilled |
| **Table bills (saved, GST + service charge, B-000001 numbering, PDF, mark paid)** | ✅ | Customers can view/download their table's bill |
| **"Request bill" / "Call waiter" alerts** | ✅ | Banner on admin Orders page |
| **Waiter staff: owner adds/disables/resets PIN; waiter login** | ✅ | Kitchen-staff role not yet |
| Earnings / reports | ❌ | Phase 7 |
| **Super admin: overview, list, details, approve/reject/suspend/reactivate** | ✅ | |
| **Onboarding gate (only ACTIVE restaurants serve menu / take orders)** | ✅ | |
| **One host, path per app + dev gateway** | ✅ | |
| Ownership checks (tenant isolation) | 🟨 | Done for restaurant, menu/category/dish, table/QR, admin order routes, billing, staff. Upload + public kitchen/customer routes still open |
| Automated tests / CI / deployment | ❌ | |

---

## 5. Session log — 22 Nov 2026

### 5.1 Analysis & design (docs)
- Reviewed the prototype against the hand-written HLD (super admin → kitchen/restaurant admin → customer/waiter).
- Wrote [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md): colour-coded "built vs missing" map, gaps found in review,
  target architecture, roles matrix, target data model (TableSession, Bill, discounts, QR tokens, staff),
  key flows (scan → session → order → kitchen → bill), API additions, anti-spam, phased roadmap, open questions.
- Wrote [SERVICE_BOUNDARIES.md](./SERVICE_BOUNDARIES.md): split the monolith by **data ownership**
  (Identity, Catalog, Table, Order + Billing, Realtime, Reporting, Customer BFF) instead of by user type;
  collection-ownership matrix, API ownership by prefix, sync calls vs events, code rules to keep it
  splittable, list of current boundary crossings, migration order.

### 5.2 Running the project
- Installed deps for all packages; fixed `seed.ts` (sample orders were missing required `tableNumber`;
  printed customer URL format).
- Switched from a temporary local MongoDB to the **Atlas cluster**: `server/src/config/env.ts` now falls
  back to the repo-root `.env`.

### 5.3 Super admin feature (backend)
- `server/src/services/super-admin/` — per-user-type service folder:
  `routes/`, `controllers/`, `validators/`, `middlewares/` (`requireSuperAdmin`), `interfaces/`, `constants/`, `index.ts`.
- Endpoints (all require login + email in `SUPER_ADMIN_EMAILS`, case-insensitive):

  | Method | Path | Purpose |
  |---|---|---|
  | GET | `/api/v1/super-admin/getMe` | Confirm super admin |
  | GET | `/api/v1/super-admin/getStats` | Counts per status + latest 5 pending |
  | GET | `/api/v1/super-admin/getRestaurants?status=&search=&page=&limit=` | Paginated list with owner |
  | GET | `/api/v1/super-admin/getRestaurant/:id` | Details + owner + menu/dish/table counts + order totals + history |
  | PATCH | `/api/v1/super-admin/approveRestaurant/:id` | PENDING/REJECTED → ACTIVE (`reason` optional) |
  | PATCH | `/api/v1/super-admin/rejectRestaurant/:id` | PENDING → REJECTED (`reason` required) |
  | PATCH | `/api/v1/super-admin/suspendRestaurant/:id` | ACTIVE → SUSPENDED (`reason` required) |
  | PATCH | `/api/v1/super-admin/reactivateRestaurant/:id` | SUSPENDED → ACTIVE (`reason` optional) |

- Restaurant model: `status` (`PENDING_APPROVAL | ACTIVE | SUSPENDED | REJECTED`, **no default** so legacy
  docs stay untouched), `statusReason` (only for rejected/suspended; shown to the owner), `statusHistory[]`
  (action, from, to, reason, changedBy email, changedAt). Transitions defined in
  `RESTAURANT_STATUS_TRANSITIONS` (`server/src/config/constants.ts`), validated in `restaurant.dm.ts`
  (with an optimistic guard against concurrent changes).
- New DM helpers: `listRestaurants`, `countRestaurantsByStatus`, `changeRestaurantStatus`,
  `getEffectiveStatus`, `isRestaurantOperational`, `getUsersByIds`, `countTablesByRestaurantId`,
  `countDishesByMenuId`, `getOrderSummaryByRestaurantId`.
- Enforcement: public `getMenu` and `placeOrder` return **403 "not accepting orders"** unless the restaurant
  is ACTIVE and not owner-deactivated. Also fixed: an order's table must belong to the given restaurant
  (prevented bypassing a suspension with another restaurant's ID).
- Google OAuth now carries `state=admin|super-admin` to redirect back to the right app (allowlisted, not an
  open redirect). `GET /auth/getProfile` returns `isSuperAdmin`.
- Seed adds demo restaurants in pending/suspended/rejected states (local use only).

### 5.4 Super admin feature (frontend) — `client/super-admin/`
- Pages: **Overview** (status tiles → filtered list, pending queue with Approve/Reject), **Restaurants**
  (status tabs with counts, debounced search, pagination, state in URL), **Restaurant detail** (info, maps
  link, owner, setup & order stats, status reason, history timeline, context-aware action buttons).
- Confirm dialog with reason (required for reject/suspend, min 3 chars); "access denied" screen for
  non-allowlisted Google accounts; purple accent to distinguish from the restaurant admin.
- Restaurant admin app: status banner (pending / suspended / rejected + reason) and correct status badge.
- Customer menu: friendly "not accepting orders" message on 403.

### 5.5 One host, path per app
- Each Vite app: `base: '/<app>/'`, `strictPort`, dev proxy for `/api` and `/socket.io`; routers use
  `basename`; API calls are same-origin `/api/v1`; kitchen socket uses the page origin.
- `gateway/dev-gateway.mjs` (http-proxy, port 8080, HTTP + WebSockets, landing page, friendly 502 when an
  app isn't running). `npm run dev` starts everything.
- Server: `CLIENT_*_URL` include the path; CORS/Socket.IO allow-lists use origins (`CLIENT_ORIGINS`);
  QR codes encode `<QR_BASE_URL>/menu/<restaurantId>/<tableId>` (since §6c: `<QR_BASE_URL>/menu/t/<qrToken>`).

### 5.6 Verification done
- 35-check API lifecycle test on the cluster using temporary owners/restaurants (all transitions, invalid
  transitions → 409, validation → 400, non-super-admin → 403, menu/order gating, history, search), run twice,
  **all passed; all temp data deleted** (cluster back to 3 untouched restaurants).
- UI walkthrough: approve from overview, suspend/reactivate from detail, filters/search, owner banner.
- Gateway: all routes, redirects, deep links, Socket.IO through the gateway, customer menu at `/menu/...`,
  OAuth `state` for both apps.
- `tsc` clean for server, super-admin, menu, kitchen; super-admin ESLint clean; all four apps build with
  assets under their base path.

---

## 6. Session log — restaurant admin services (staff, billing, per-service folders)

### 6.1 Backend: one folder per service
All server code moved from layer folders (`dm/`, `routes/`, `controllers/`…) into
`server/src/services/<service>/` — **auth, restaurant, menu, table, order, billing, staff, upload, realtime,
super-admin**. Each service has its own `routes/ controllers/ validators/ dm/ interfaces/ constants/` and an
`index.ts` barrel that exports only DM namespaces + types (no routers/middlewares → no import cycles).
`routes/index.ts` mounts each under `/api/v1/<service>`.

- **auth** — owns tokens + access checks for every service: `requireAuth`/`requireUser`,
  `requireRestaurantAccess(roles, resolver)` (`OWNER_ONLY`, `ALL_RESTAURANT_ROLES`; staff re-checked in DB on
  every request so disabling a waiter is immediate), `getActorName()`.
  JWT is `{kind:'USER',userId,email}` (owner) or `{kind:'STAFF',staffId,restaurantId,role}` (waiter), same `token` cookie.
- **staff** (new) — waiters with username + scrypt-hashed PIN, lockout after repeated failures.
- **billing** (new) — saved table bills, per-restaurant counter, PDF.

### 6.2 API changes (all under `/api/v1`)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/auth/staffLogin` | public | `{restaurantCode, username, pin}` → sets cookie |
| PUT | `/restaurant/setBillingSettings/:id` | owner | `{gstPercent 0–28, serviceChargePercent 0–20}` |
| * | `/menu/category/*`, `/menu/dish/*` | owner | **moved** from `/category/*`, `/dish/*`; new `GET /menu/dish/get/:id` |
| GET | `/menu/public/getMenu/:restaurantId/:tableId` | public | **moved** from `/public/getMenu/...` |
| POST | `/table/generateQr/:tableId` | owner | **moved** from `/qr/generate/:id` |
| GET | `/table/getQr/:tableId` | owner, waiter | **moved** from `/qr/get/:id` |
| GET | `/table/getAll/:restaurantId` | owner, waiter | add/addBulk/delete stay owner-only |
| GET | `/order/getAll/:restaurantId?tableId=&status=` | owner, waiter | now requires login + access |
| GET | `/order/getByTable/:tableId` | owner, waiter | `{orders, unbilledCount, unbilledAmount}` — current customer only (orders after the table's last bill) |
| PATCH | `/order/setStatus/:orderId` | owner, waiter | cancelling a billed order → 409 |
| GET | `/billing/previewTableBill/:tableId` | owner, waiter | totals for unbilled, non-cancelled orders |
| POST | `/billing/generateTableBill` | owner, waiter | `{tableId}` → bill `B-000001`; nothing to bill → 400; race → 409 |
| GET | `/billing/getAll/:restaurantId?status=&tableId=` | owner, waiter | |
| GET | `/billing/get/:billId` · `/billing/getPdf/:billId` | owner, waiter | |
| PATCH | `/billing/markPaid/:billId` | owner, waiter | `{paymentMode: CASH\|UPI\|CARD}`; twice → 409 |
| GET | `/billing/getOrderPdf/:orderId` | owner, waiter | replaces `/invoice/getPdf/:id` |
| POST | `/staff/add` | owner | `{restaurantId, name, username, pin?}` → `{staff, pin}` (PIN shown once) |
| GET | `/staff/getAll/:restaurantId` | owner | |
| POST | `/staff/resetPin/:id` · PATCH `/staff/setActive/:id` · DELETE `/staff/remove/:id` | owner | |

Removed prefixes (now 404): `/category`, `/dish`, `/qr`, `/invoice`, `/public`.
Model changes: Restaurant `restaurantCode` (6 digits, unique; existing restaurants backfilled at startup) +
`billingSettings`; Dish `spiceLevel/servingSize/calories/ingredients/allergens`; Order `billId`;
new `Staff`, `Bill`, `Counter` collections.
Bill math: service charge on subtotal; GST on subtotal + service charge; 2-decimal rounding.

### 6.3 Frontend (`client/admin`, `client/menu`)
- **Login**: Google (owner) + new staff form (restaurant code, username, PIN).
- **Roles**: waiters see only Tables, Orders, Bills; owner-only pages redirect to Orders.
- **Tables**: "Orders & Bill" per table → orders on that table, bill preview (GST/service), Generate Bill, open PDF.
  Add/delete/QR buttons owner-only.
- **Orders**: per-table "Orders & Bill" (replaces old Table Invoice), per-order PDF via billing service,
  "Billed" chip, server error messages shown (e.g. 409).
- **Bills** (new page): All/Unpaid/Paid filter, view breakdown, PDF, mark paid with payment mode.
- **Staff** (new page): restaurant code, add waiter (PIN shown once), reset PIN, enable/disable, remove.
- **Restaurant**: shows staff login code; Billing Settings form (GST %, service charge %).
- **Menu Builder**: dish detail fields; shown on dish cards and in the customer menu.
- All admin API paths updated to the new service prefixes; menu app uses `/menu/public/getMenu`.

### 6.4 Verification
- 37-check E2E API test on the cluster with temporary owner/restaurant/waiter (staff login, access control,
  billing math, PDFs, 400/403/409 cases, disabled waiter) — **all passed, temp data deleted**, run twice.
- `tsc` clean: server, menu; admin only the 2 pre-existing unused-var errors. All pages load through :8080.

---

## 6b. Session log — waiter ordering + admin setup feedback

### 6b.1 Waiter (all inside the admin app, `/admin/`)
Login: restaurant code (6 digits) + username + PIN. A waiter can: see all orders (+ per table),
**take an order for a table** (new), update order status, generate the table bill, mark it paid.

### 6b.2 Backend / API (all under `/api/v1`)
| Change | Detail |
|---|---|
| `POST /order/placeByStaff` (new) | Owner or waiter of that restaurant. Same body as `/order/place` minus GPS. Order stores `placedBy {role, actorId, name}` and is pushed to the kitchen. |
| Dish ownership check | `placeOrder` rejects dishes not on this restaurant's menu (400) — applies to customer orders too (was a gap). |
| `GET /setup/getStatus/:restaurantId` (new, owner only) | New `services/setup/` — steps restaurant → menu (≥1 dish) → tables (≥1 table) → theme (saved once); each step `unlocked` only when the previous is done; `isComplete`, `nextStep`. |
| `Menu.themeSavedAt` (new field) | Set by `setTheme`; the default theme alone doesn't complete the theme step. |
| `POST /table/add`, `/table/addBulk` | Now generate + upload each QR automatically (`table/utils/qr.util.ts`, bulk in batches of 5). Best-effort: a failed upload keeps the table and the message says so. `POST /table/generateQr/:id` stays for retry. |

### 6b.3 Admin frontend
- **Quick Setup is sequential**: Dashboard cards show locked 🔒 / current / done; a locked step can't be opened (route guard `SetupRoute` too).
- **Sidebar shows only Dashboard until setup is complete** (with a "Finish Quick Setup x/4" hint); Orders/Bills/Staff routes redirect to the Dashboard until then.
- **Step banner** on each setup page: "Step N of 4", status, "Next: … →" enabled only when the step is done.
- **Tables**: no manual "Generate QR"; QR appears on create (single & bulk); "Retry QR" only if it failed. New **➕ Take Order** per table.
- **Orders**: **+ New Order** (pick table → menu → cart with notes, customer name, instructions); staff-placed orders show "🧑‍🍳 by <name>".
- New: `components/TakeOrderModal.tsx`, `components/SetupStepBanner.tsx`; `AuthContext` exposes `setup`, `isSetupComplete`, `refreshSetup`.

### 6b.4 Verification
- 32-check E2E on temporary data (setup progression, theme step, auto QR single + bulk on Cloudinary, waiter PIN login,
  placeByStaff, placedBy, status flow, bill + paid, foreign dish 400, other restaurant 403, disabled waiter) — all
  behaved as expected; temp data and QR images deleted.
- `tsc` clean on server; admin only the pre-existing `Restaurant.tsx` unused var.

### 6b.5 Follow-up: staff PIN visible to owner, waiter login on root page
- **Owner can view waiter PINs**: Staff page shows `PIN: •••••• 👁 Show`. New `GET /staff/getPin/:id` (owner of that
  restaurant only). PINs are still scrypt-hashed for login, plus an AES-256-GCM copy (`Staff.pinEncrypted`, key from
  `PIN_ENCRYPTION_KEY`, falling back to `JWT_SECRET`). Waiters created before this show "reset to view" (409) until
  their PIN is reset. The staff list returns `hasViewablePin`, never the PIN/hash.
- **Waiter login**: `/admin/login` → "Waiter login" (restaurant code + username + PIN). `/admin/login?code=<code>`
  prefills the code; the Staff page shows/copies this link. The gateway root page `http://localhost:8080/` now has a
  "Who logs in where" table.
- **Waiters on Tables** (verified by an 18-check E2E, temp data deleted): can list tables, view/download QR codes, take
  orders and bills; adding, bulk adding, deleting tables and regenerating QR are owner-only on the server (403) and
  hidden in the UI.

### 6b.6 Follow-up: a bill closes the table's customer session; PINs always visible
- **Session rule**: a table's *current customer* = its unbilled orders placed after the table's last billed order.
  Generating a bill also attaches that table's unbilled cancelled / not-delivered orders to the bill (`billId` set,
  not in `orderIds`, not charged), so nothing from a previous customer carries over. Older cancelled leftovers from
  before this change are excluded by the same time rule.
- **Orders page**: tabs **Current** (one card per table — current customer only, with customer names and
  Orders & Bill) and **Completed (billed)** (one card per bill — bill number, table, customer names, bill total,
  Paid/Unpaid, Bill PDF, and the orders). Status filters apply within the tab.
- **Table "Orders & Bill" modal**: shows only the current customer's orders; earlier customers are under a collapsible
  "Previous bills" list (bill number, time, orders, total, paid status, PDF).
- **Staff PIN**: the owner's staff list (`GET /staff/getAll`) now returns each waiter's `pin`, shown directly on the
  Staff page — it never changes unless the owner resets it. Older waiters without a stored PIN get it saved
  automatically on their next successful login (no reset needed).
- Verified by a 20-check E2E on temporary data (deleted afterwards).

---

## 6c. Session log — customer (diner) side

### 6c.1 Flow
1. Diner scans the table QR → `/menu/t/<qrToken>`. The token is random (not the table id), so a QR can't be
   guessed from another table's link, and the owner can kill a leaked/photographed QR with **Regenerate QR**.
2. The menu is public (browse without login). To add to the cart / order the diner signs in with **Google**
   (free; SMS OTP costs money per message). Customers are a separate `Customer` collection and cookie
   (`qr_customer_token`) — a customer token can never call admin APIs.
3. Signing in **joins the table session** — one open session per table (unique index), created by the first
   diner, shared by everyone at the table. GPS is checked once on join (skipped in development).
4. **One shared cart per table.** Every line is tagged with who added it; anyone can change quantities or place
   the order. All updates are atomic Mongo updates; placing takes the cart by `cartVersion`, so two people
   pressing "Place order" at once create exactly one order (the other gets 409 and refreshes).
5. **Live sync (Cart and Orders tabs only):** every change pings the Socket.IO room `table:<tableId>` ("something
   changed", no data); clients refetch over the authenticated REST API. Polling (5 s when the socket is down, 30 s
   otherwise) and refetch on tab focus cover dropped sockets. The **Menu tab has no socket and no polling** — each
   add/change response already carries the fresh table view, and opening Cart/Orders refetches immediately.
6. Diners see their orders with live status, a running bill preview, and can press **Request bill** / **Call
   waiter** (banner on admin **Orders**, pushed via `table_alert`).
7. When staff generate the bill the session closes: diners see the final bill (+ PDF, Paid status). The next
   party scanning the same QR starts a fresh session with an empty cart and no old orders.

### 6c.2 API (all under `/api/v1`)
| Endpoint | Who | Notes |
|---|---|---|
| `GET /auth/google?app=menu&returnTo=/t/<token>` · `GET /auth/customer/getProfile` · `POST /auth/customer/logout` | customer | Google login for diners |
| `GET /table-session/resolve/t/:qrToken` | public | Table + restaurant + menu. Unknown token → 404 |
| `GET /table-session/resolve/:restaurantId/:tableId` | public | Old QR links; **410** once the table has a token |
| `POST /table-session/join` | customer | `{qrToken \| restaurantId+tableId, gpsCoordinates?}` |
| `GET /table-session/get/:sessionId` | member | Members, cart, orders, alerts |
| `POST /table-session/cart/add/:sessionId` · `PATCH /cart/setQuantity/:sessionId` | member | Quantity 0 removes the line |
| `POST /table-session/placeOrder/:sessionId` | member | `{cartVersion, specialInstructions?}` |
| `POST /table-session/requestBill/:sessionId` · `POST /callWaiter/:sessionId` | member | Alerts staff |
| `GET /table-session/getOpen/:restaurantId` | owner/waiter | Occupied tables + alerts + `unbilledOrders` count per table |
| `PATCH /table-session/clearAlert/:sessionId` `{type: BILL\|WAITER}` · `POST /close/:sessionId` | owner/waiter | Close only when nothing unbilled |
| `GET /billing/customer/getBill/:sessionId` · `GET /billing/customer/getPdf/:sessionId` | member | Running preview or final bill |
| **Removed:** anonymous `POST /order/place` and `GET /order/getActiveByTable/:tableId` | | Replaced by table sessions |

`POST /table/generateQr/:tableId` now issues a new `qrToken` (old QR dead); tables get a token on create.

### 6c.3 Frontend
- `client/menu` rewritten: `api/`, `hooks/` (`useCustomer`, `useTableSession`, `useTableSync`), `components/`
  (Menu / Cart / Orders tabs, bill card, closed-session screen), `utils/`.
- `client/admin`: Orders page **table alerts banner** (bill requested / waiter called, with "Orders & Bill" and
  "Done"; lists occupied tables); order items show who added them; Tables page shows **Open menu** link and
  owner-only **Regenerate QR** (with warning), and flags old-style QRs.
- Same banner on the Tables page. Each occupied table shows "Orders & Bill" when it has unbilled orders,
  otherwise **🧹 Clear table** (owner and waiter). Use it when a party leaves without a bill (e.g. only browsed),
  so the next party scanning the QR doesn't join the old session and see the old cart.

### 6c.4 Verification
- 40-check backend E2E on temporary data (deleted afterwards): concurrent adds, double place-order,
  stale `cartVersion` → 409, non-member → 403, bill closes the session, PDF, new party gets a clean session,
  simultaneous first scans share one session, old token dead after rotate. Found and fixed a bug: cart line
  updates now use `arrayFilters` (positional `$` matched the `members` array instead of the cart).
- Clear-table E2E (9 checks, temp data): waiter/owner see `unbilledOrders`, clear → 409 while orders are
  unbilled, succeeds once nothing billable remains, next scan gets a fresh session.

## 6d. Session log — order editing, mobile layouts, new customer menu

### 6d.1 Order editing (owner + waiter)
- **API:** `PATCH /order/updateItems/:orderId` — body `{ items: [{dishId, quantity, notes?, addedBy?}] (1–100), specialInstructions? }`,
  any restaurant role (`ALL_RESTAURANT_ROLES`). Editable until the order is billed; `CANCELLED` / `CANNOT_DELIVER`
  → 409 `EDIT_CLOSED`, billed → 409 `EDIT_BILLED`. Removing every item is rejected (cancel the order instead).
- Dishes already on the order keep their snapshot name/price; newly added dishes are validated against this
  restaurant's menu and priced at today's price (`snapshotItems` in `order.dm.ts`, shared with `placeOrder`).
  The update is a conditional `findOneAndUpdate` (`billId: null`), so an edit can't race a bill.
- New `editedBy {role, actorId, name, at}` on the order. Kitchen + table room are notified (status-updated / table-updated events).
- **Admin UI:** `components/EditOrderModal.tsx` (−/+ qty, remove, notes, add dishes from the menu, new total).
  Opened from the ✏️ Edit button on the Orders page and in the table "Orders & Bill" window (`utils/order.ts → canEditOrder`).
  Orders show "✏️ edited by X".
- E2E (11 checks, temp data, deleted): owner/waiter edit, snapshot kept, new dish at current price, total recomputed,
  empty → 400, foreign dish rejected, cancelled/billed → 409, other owner → 403.

### 6d.2 Responsive (every app)
- **Admin:** ≤900px → top bar with ☰, sidebar becomes a slide-in drawer (closes on link/backdrop/✕).
  Phone rules live in `client/admin/src/responsive.css` (imported last in `main.tsx`): single-column forms and
  grids, bottom-sheet modals, wrapping order/bill rows, scrollable filter chips, 16px inputs (no iOS zoom),
  always-visible category actions, full-screen menu preview.
- **Super-admin:** same drawer pattern; tables collapse to labelled cards on phones (`data-label` cells).
- **Kitchen:** 2 columns ≤1024px, 1 column ≤640px. **Gateway landing page:** viewport tag + stacked cards.
- Checked with Playwright (Edge) at 390px: no horizontal overflow on any admin page or the customer menu.
  (Note: plain `msedge --headless --window-size=390,…` has a ~500px minimum width — use real mobile emulation.)

### 6d.3 Customer menu redesign (`client/menu/src/components/MenuTab.tsx`)
- Sticky toolbar: horizontal category icon strip (tap → opens + scrolls to that category) and
  Search / Non-veg / Veg chips (veg chips toggle; search matches name, description, tags).
- Collapsible category cards: image, name, "N items" badge, chevron; first category open by default; while
  searching, all matching categories are expanded. Dishes inside are compact list rows with the shared-cart controls.
- Category image: its own `imageUrl` → first dish photo → first letter. Admin Menu Builder can now upload a
  category image (`/upload/image?folder=categories`).
- Dishes are always shown as a list now, so the theme's grid/list `layout` setting no longer changes this page.
- No "Egg" chip — dishes only have `isVeg`; adding it needs a `dietType` field on Dish.

### 6d.4 Orders tabs: Current → Billed → Completed
- **Current**: the customer now at each table. Open **Orders & Bill** → **Generate Bill**. The popup says the bill
  is now in Billed and offers a "Go to Billed" button (`/orders?tab=billed`).
- **Billed**: bills still UNPAID. Each one shows **Mark paid: 💵 Cash / 📱 UPI / 💳 Card**, and one tap calls
  `PATCH /billing/markPaid/:billId`. The bill then moves to Completed.
- **Completed**: PAID bills, showing the payment mode.
- The tab is stored in the URL (`?tab=billed|completed`). The **Bills** page is history only (view and PDF).
- Shared component: `client/admin/src/components/PayButtons.tsx`. No backend change.
- The session rule is unchanged: generating the bill ends the table's customer session, and the next QR scan starts a new one.

### 6d.5 Cloudinary free-tier hygiene (image cleanup + thumbnails)
- **Upload path (unchanged)**: browser → `POST /upload/image` (multer, in memory) → Cloudinary stores one copy,
  max 800px, WebP, `q_auto:good`. Mongo stores only the URL.
- **Cleanup**: `server/src/services/upload/dm/image-cleanup.dm.ts` (`ImageCleanupDM`). `releaseImage(url)` deletes the image
  only if the URL is ours (our cloud and a `qr-menu/{dishes,categories,logos,backgrounds}` folder) and
  no dish, category, logo or menu background uses it. It is best-effort and never throws.
  - Dish and category: replacing or deleting removes the old image (`dish.dm` / `category.dm`).
  - Logo (`restaurant.dm.updateRestaurant`) and menu background (`menu.dm.setMenuTheme`): replacing or clearing removes the old image.
  - Table delete: removes `qr-menu/qr-codes/table-<id>` (`table/utils/qr.util.ts deleteTableQr`).
- **New API** `DELETE /upload/image { url }` (owner): discards an image that was uploaded but never saved.
  - Admin hook `client/admin/src/hooks/usePendingUpload.ts` calls it when you cancel the dish or category form,
    upload a second photo before saving, remove an unsaved background, leave the page, or when saving the logo fails.
- **Thumbnails**: `thumbUrl()` (`client/menu/src/utils/image.util.ts`, `client/admin/src/utils/image.ts`) requests
  `c_fill,w_160,h_160,f_auto,q_auto` for dish, category and logo thumbnails instead of the 800px original. This saves bandwidth, not storage.
  Cloudinary builds the version once and caches it. One size is used everywhere, so there is a single cached copy per photo.
- Verified against real Cloudinary and Mongo:
  - An in-use image is kept, an unused upload is deleted (Admin API 404), and a foreign URL is ignored.
  - The route returns 401 without a token and 400 for a bad URL.
  - The thumbnail is served as WebP and is smaller.
- Not done:
  - Images orphaned before this change stay in Cloudinary (a one-off sweep can be added).
  - Deleting a category doesn't cascade to its dishes (pre-existing).

### 6d.6 Quick Setup waits for super admin approval
- **Step 1 (Restaurant details)** is always open. **Steps 2–4 (Menu, Tables, Theme)** unlock only once the super admin
  approves the restaurant (status ACTIVE, or SUSPENDED after an earlier approval) *and* the previous step is done.
- `GET /setup/getStatus/:restaurantId` now also returns:
  - `steps[].lockedReason`: `PREVIOUS_STEP` or `AWAITING_APPROVAL`
  - `awaitingApproval`
  - `restaurantStatus`
  - `isComplete` is true only when the restaurant is approved.
- Server guard `requireApprovedOwner` (`auth/middlewares/restaurant-access.middleware.ts`) = owner check + approval check.
  It is used on every owner route for menu, category, dish, table/QR and staff.
  Before approval these routes return 403 "Your restaurant is waiting for approval…". Restaurant routes (step 1) are not guarded.
- Admin UI:
  - Dashboard cards show "⏳ Unlocks after approval" with a blue note, and re-check every 30s so they unlock without a reload.
  - The step banner's Next button is disabled with the same message.
  - The sidebar says "Waiting for approval".
  - The status banner text now matches.
- Verified on a temporary pending restaurant (deleted afterwards):
  - Pending or rejected: only step 1 is unlocked, and table/staff APIs return 403.
  - After approval: menu is unlocked and APIs return 200.

### 6d.7 Preview close and setup-complete redirect
- Phone preview (MenuPreview):
  - Has a ✕ close button and closes on Esc.
  - The phone shrinks to fit small screens, so there's always room to click outside.
- Saving the theme when it's the last setup step redirects to the Dashboard.
  - The Dashboard shows "🎉 Your setup is complete!" with links to Staff, Restaurant (billing), Tables (print QRs) and Orders.
- `refreshSetup()` now returns the fresh setup status.

### 6d.8 Super admin: delete restaurant
- **API:** `DELETE /api/v1/super-admin/deleteRestaurant/:id` with body `{ confirmName }`.
  - `confirmName` must match the restaurant name, otherwise the API returns 400. A missing restaurant returns 404.
- **What it deletes (permanent, any status):** the restaurant and everything under it:
  - Menus, categories, dishes and tables.
  - Staff, orders, bills, table sessions and the bill-number counter.
  - The owner's user account, which frees the email to sign up again.
- Cloudinary images (logo, dish, category, background and table QRs) are deleted after the DB.
- Children are deleted before the restaurant, so a failed delete can be retried.
- Logic is in `super-admin/dm/restaurant-deletion.dm.ts`.
- **Super admin UI:** the restaurant detail page has a **Danger zone** card.
  - Clicking it opens a dialog listing what will be deleted. You type the restaurant name to confirm.
  - After deleting, it returns to the list with a success message.
- Waiter tokens stop working immediately, because their staff records are gone.

### 6d.9 Call-waiter ringing, view-only menu, QR cards, landing page
- **Alert routing:** `table_alert` (Call waiter / Request bill) now carries `notify: 'WAITERS' | 'OWNER'`.
  - `WAITERS` when the restaurant has at least one active staff (`staff.dm.ts countActiveStaff`), otherwise `OWNER`.
  - Admin app (`components/TableAlertNotifier.tsx`, mounted in `Layout.tsx` after setup) rings a chime (`utils/alert-sound.ts`) and shows a pop-up with the **table number** until dismissed.
  - Waiters ring on `WAITERS`; the owner rings only on `OWNER` but still sees the on-page alert list.
  - Browsers block sound until the first tap, so a "Tap to enable sound" pill shows until then.
- **Customer ordering toggle:** new menu field `customerOrderingEnabled` (default `true`).
  - Set via `PUT /api/v1/menu/update/:menuId`; returned in the public menu.
  - When `false`, customer add-to-cart and place-order return **403** ("This restaurant takes orders through its staff…"). Joining, Call waiter and Request bill still work.
  - Customer menu hides Add buttons and the Cart tab and shows a "Browse the menu" card with Call waiter.
- **Theme tab renamed → Customer Menu** (`/admin/customer-menu`; old `/admin/settings` redirects). Page has "How customers use this menu" (View & order / View only) and "Look & feel".
- **QR download card** (`components/QrDownloadModal.tsx`): PNG with restaurant name, **TABLE N**, label and CTA; background colour from theme, presets or custom (remembered per restaurant); text colour auto-contrasts.
- **Landing page:** `client/landing/index.html` (static, shared by the server `/` and the dev gateway `/`). No super admin link; super admins use `/super-admin/` directly. Staff login link is `/admin/login?staff=1` (focuses restaurant code). Gateway dev notes moved to `/dev`.

---

## 7. Decisions made

| Decision | Choice |
|---|---|
| Database | Shared MongoDB Atlas cluster (no local DB) |
| Super admin identity | Email allowlist `SUPER_ADMIN_EMAILS` (env), not a DB role — for now |
| Legacy restaurants without `status` | Treated as ACTIVE at read time; no data migration |
| New restaurants | Start `PENDING_APPROVAL`; owner can still build menu/tables while pending |
| Reason rules | Required for reject/suspend; optional note for approve/reactivate (history only) |
| Code organisation | One folder per service named after what it does (`server/src/services/<service>/`); shared plumbing only in `config/ middlewares/ utils/` |
| Waiter login | 6-digit restaurant code + username + 4–6 digit PIN at `/admin/login` (owner logs in with Google) |
| Staff PIN visibility | Owner can view (encrypted at rest, hash used for login); older PINs viewable after a reset |
| Waiter permissions | See all orders / orders per table, change order status, generate table bill, mark bill paid |
| Bill contents | All unbilled, non-cancelled orders on the table (orders still cooking are included, with a warning) |
| Tax | GST % and service charge % configured per restaurant; prices are tax-exclusive |
| URLs | One host, one path per app (separate apps/bundles); dev gateway locally, reverse proxy in prod |
| Microservices (future) | Split by data ownership: Identity, Catalog, Table, Order(+Billing), Realtime, Reporting, Customer BFF |
| QR link | `/menu/t/<random qrToken>`, not raw ids; rotating the token kills the printed QR |
| Customer login | Google only (free). Separate `Customer` collection + cookie; browsing the menu needs no login |
| Several diners at one table | One table session + one shared cart; items tagged by person; anyone can place; `cartVersion` stops double orders |
| Table session lifetime | Opened by the first diner, closed when the bill is generated (or idle 4 h with nothing unbilled, or staff close) |
| Customer live sync | Socket "changed" ping to `table:<id>` + REST refetch, polling fallback (no order data over the socket) |

---

## 8. What's next (roadmap)

Order follows [SYSTEM_DESIGN.md §9](./SYSTEM_DESIGN.md).

| Phase | Scope | Status |
|---|---|---|
| **0 – Hardening** | Ownership on upload; auth on kitchen + public table-order endpoints; money in integer paise; automated tests (Jest + supertest) | 🟨 ownership done for admin routes |
| 0b – Restructure | Per-service folders | ✅ |
| 1 – Roles & onboarding | Staff (WAITER ✅, KITCHEN ❌), super admin creates restaurant / invites owner | 🟨 |
| 2 – Discounts | Per-dish discount, strikethrough price, order price snapshots | ❌ |
| 3 – QR tokens | Random rotatable QR token ✅, deactivate table ❌ | 🟨 |
| 4 – Table sessions | Shared session per seated party ✅, shared cart ✅, orders + live status via socket ✅ | ✅ |
| 5 – Billing | Saved bills ✅, GST/service ✅, numbering ✅, mark paid ✅, void ❌, customer download ✅ | 🟨 |
| 6 – Staff app | Kitchen can change statuses; waiter mode (order for table ✅, ready alerts, request bill ✅) | 🟨 waiter can take orders, manage orders/bills in admin |
| 7 – Earnings | Revenue by day/week/month, top dishes, per table/waiter | ❌ |
| 8 – Later | Online payments, call-waiter button ✅, customer SSO ✅ (Google), multi-branch | 🟨 |

### Open questions
1. Kitchen staff login (same PIN flow?) and can kitchen change statuses?
2. Void / reopen a bill?
3. Separate database per module from day 1 (for the microservice split)?
4. Message broker later: Redis Streams vs NATS vs RabbitMQ?
5. Should staff confirm the first order of each table session (anti-spam)?

---

## 9. Known issues & gotchas

- ⚠️ **`npm run seed` deletes every collection** — never run it against the Atlas cluster.
- Upload route and kitchen board (`getKitchenOrders`) are not tenant-checked / public. The old public
  `getActiveByTable` and anonymous `POST /order/place` were removed (§6c).
- QR codes generated before §6c encode `/menu/<restaurantId>/<tableId>` (some even `…:5174/menu/...`); they keep
  working until the owner presses **Regenerate QR** (Tables page flags them as "Old-style QR").
- The socket `restaurant:<id>` room (kitchen board, admin alerts banner) has no auth; it carries order data for
  the kitchen. Table rooms only carry "changed" pings.
- GPS check is skipped when `NODE_ENV=development` and trusts client coordinates.
- Client category/dish reorder sends `{menuId|categoryId, orderedIds}` but the server expects
  `{items:[{id, displayOrder}]}` (pre-existing mismatch).
- Admin "Update GPS" sends `{latitude, longitude}` but the server expects `{gpsCoordinates:{…}}` (pre-existing).
- Pre-existing: unused-variable TypeScript error in `client/admin` `Restaurant.tsx`;
  Mongoose "duplicate index on ownerId" warning (restaurant model declares it twice).
- Some old cluster orders have no `tableNumber` (kitchen shows "Table #?").
- For a production domain, register `https://<domain>/api/v1/auth/google/callback` in Google Cloud Console.
- Windows-on-ARM dev machine: MongoDB has no native ARM build for Windows (only relevant if running Mongo locally).

---

## 10. Git state

All work is **uncommitted** on top of `d619d80 Initial commit` (super admin + gateway + docs from the first
session, the per-service restructure + staff + billing from the second, and waiter ordering + setup gating from the third). Note: the restructure moved
files, so `git status` shows the old layer folders as deleted and `server/src/services/*` as new.
