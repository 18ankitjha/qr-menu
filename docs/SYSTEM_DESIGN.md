# QR Menu — System Design (v3)

This document has two parts:

1. **Where we are** – what the prototype already does vs. the requirements (HLD notebook page).
2. **Where we're going** – the target system design, broken into phases we can build piece by piece.

> Diagrams are Mermaid. They render on GitHub, and in VS Code with the
> "Markdown Preview Mermaid Support" extension.
>
> Service boundaries, data ownership and the future microservice split are in
> [SERVICE_BOUNDARIES.md](./SERVICE_BOUNDARIES.md).

---

## 1. Requirements (from the HLD)

| Actor | Needs |
|---|---|
| **Super Admin** (us, 1–2 users) | Onboard a restaurant/kitchen |
| **Restaurant Admin / Kitchen** | Make menu, add food item, discount, add tables + generate QR (and invalidate a table's QR), take orders, check a table's orders, check all orders, generate bill, print invoice, overall earnings, add waiter |
| **Customer** (session TTL ≈ 1 hour) / **Waiter** | Open menu (optional SSO login), add item, view cart, place **multiple** orders, view orders, download invoice |

---

## 2. Current status — what's built vs. what's missing

Legend: 🟩 done · 🟨 partial / has gaps · 🟥 not started

```mermaid
flowchart LR
    classDef done fill:#c8f7c5,stroke:#2e7d32,color:#1b5e20
    classDef partial fill:#fff3c4,stroke:#f9a825,color:#6d4c00
    classDef todo fill:#ffd6d6,stroke:#c62828,color:#7f0000

    subgraph SA["👑 Super Admin"]
        direction TB
        SA1["Super-admin role<br/>(email allowlist)"]:::done
        SA2["Approve / reject onboarding<br/>(no owner invite yet)"]:::partial
        SA3["Activate / suspend<br/>restaurant"]:::done
        SA1 ~~~ SA2 ~~~ SA3
    end

    subgraph RS["🏪 Restaurant Admin — Setup"]
        direction TB
        RS1["Google login"]:::done
        RS2["Register restaurant + GPS<br/>(self-serve today)"]:::partial
        RS3["Menu, categories, theme"]:::done
        RS4["Add food item + image"]:::done
        RS5["Per-item discount<br/>(strikethrough)"]:::todo
        RS6["Add tables<br/>(single / bulk)"]:::done
        RS7["Generate table QR"]:::done
        RS8["Invalidate / rotate QR"]:::todo
        RS9["Add waiter / staff"]:::todo
        RS1 ~~~ RS2 ~~~ RS3 ~~~ RS4 ~~~ RS5 ~~~ RS6 ~~~ RS7 ~~~ RS8 ~~~ RS9
    end

    subgraph RO["🍳 Restaurant Admin — Operations"]
        direction TB
        RO1["Take orders / change status<br/>(admin page only)"]:::partial
        RO2["Live kitchen board<br/>(read-only, no login)"]:::partial
        RO3["Check table orders<br/>(all-time, no session)"]:::partial
        RO4["Check all orders"]:::done
        RO5["Generate bill / print invoice<br/>(PDF only, no tax, not saved)"]:::partial
        RO6["Overall earnings"]:::todo
        RO1 ~~~ RO2 ~~~ RO3 ~~~ RO4 ~~~ RO5 ~~~ RO6
    end

    subgraph CU["📱 Customer"]
        direction TB
        CU1["Scan QR → open menu"]:::done
        CU2["Add item / view cart"]:::done
        CU3["Place order"]:::done
        CU4["Place multiple orders<br/>(UI locks after 1st)"]:::partial
        CU5["Track order status<br/>(polling, last order only)"]:::partial
        CU6["View all my orders"]:::todo
        CU7["View bill / download invoice"]:::todo
        CU8["1-hour table session"]:::todo
        CU9["Optional SSO login"]:::todo
        CU10["GPS anti-spam<br/>(off in dev, spoofable)"]:::partial
        CU1 ~~~ CU2 ~~~ CU3 ~~~ CU4 ~~~ CU5 ~~~ CU6 ~~~ CU7 ~~~ CU8 ~~~ CU9 ~~~ CU10
    end

    subgraph WA["🧑‍🍳 Waiter"]
        direction TB
        WA1["Waiter login"]:::todo
        WA2["Order on behalf of table"]:::todo
        WA3["Ready-to-serve alerts"]:::todo
        WA4["Mark delivered /<br/>request bill"]:::todo
        WA1 ~~~ WA2 ~~~ WA3 ~~~ WA4
    end

    subgraph PL["⚙️ Platform"]
        direction TB
        PL1["Layered API<br/>route → validate → controller → DM"]:::done
        PL2["Cloudinary uploads"]:::done
        PL3["Socket.IO (kitchen room)"]:::done
        PL4["Tenant isolation / ownership<br/>(restaurant + menu only)"]:::partial
        PL5["Roles & permissions (RBAC)"]:::todo
        PL6["Automated tests"]:::todo
        PL7["Deployment / CI"]:::todo
        PL1 ~~~ PL2 ~~~ PL3 ~~~ PL4 ~~~ PL5 ~~~ PL6 ~~~ PL7
    end

    SA ~~~ RS ~~~ RO ~~~ CU ~~~ WA ~~~ PL
```

**Super admin (built):** `client/super-admin` (served at `/super-admin/`) + `server/src/services/super-admin/`. Access is an
email allowlist (`SUPER_ADMIN_EMAILS`). Restaurants now carry `status` (`PENDING_APPROVAL` → `ACTIVE` /
`REJECTED`, `ACTIVE` ⇄ `SUSPENDED`) with a `statusHistory` audit trail; only `ACTIVE` restaurants serve
their menu or accept orders. Restaurants created before this have no `status` and are treated as `ACTIVE`.

### 2.1 What exists today (code map)

| Area | Where | Notes |
|---|---|---|
| Server (Express + TS + Mongo) | `server/src` | Clean `routes → validators → controllers → dm` layering, zod validation, constants. |
| Auth | `auth.controller.ts`, `auth.middleware.ts` | Google OAuth → JWT cookie. One user = one restaurant, **no roles**. |
| Restaurant | `dm/restaurant` | Register / update / GPS / deactivate. Owner check ✅. |
| Menu, Category, Dish | `dm/menu`, `dm/category`, `dm/dish` | CRUD, reorder, availability toggle, theme. **No discount fields.** |
| Tables + QR | `dm/table`, `qr.controller.ts` | Add / bulk add / delete. QR encodes `/menu/{restaurantId}/{tableId}` (raw IDs – cannot be rotated). `isActive` exists but nothing toggles it. |
| Orders | `dm/order` | Place (server re-prices from DB ✅), status state machine, kitchen 30-min window, Socket.IO emit. |
| Invoice | `dm/invoice/invoice.dm.ts` | On-the-fly PDF per order and per table. Table PDF sums **every order ever** for that table, including cancelled ones. No tax, no bill number sequence, nothing persisted. |
| Admin app | `client/admin` | Dashboard, Restaurant, Menu Builder, Tables (+QR), Orders (status + PDF), Settings (theme). |
| Customer app | `client/menu` | Menu → cart → place order → status screen (polls). No way back to the menu, no order list, no bill. |
| Kitchen app | `client/kitchen` | Real-time read-only board via `?restaurant=<id>`. **No auth.** |

### 2.2 Gaps to fix before building on top (found while reviewing)

1. **Missing ownership checks** – category, dish, table, QR, order, invoice and upload routes only check *"is logged in"*, not *"owns this restaurant"*. Any logged-in Google user can read or modify another restaurant's data or download its invoices.
2. **Public data exposure** – `getKitchenOrders/:restaurantId` and `getActiveByTable/:tableId` are unauthenticated; anyone with an ID can see orders. *(Status: `getActiveByTable` removed — diners read their table via the authenticated table-session API. Kitchen board still open.)*
3. **QR cannot be invalidated** – it encodes raw Mongo IDs. A leaked or photographed QR works forever (subject to GPS only). *(Status: fixed — QR encodes `/menu/t/<qrToken>`, rotated by "Regenerate QR".)*
4. **Table bill is wrong once a table is reused** – no concept of a "visit"/session, so the table invoice includes previous customers' and cancelled orders. *(Status: fixed — table sessions; a bill closes the session.)*
5. **Money as floats** – totals use JS floating-point; store integer paise instead.
6. **GPS check is client-trusted** and disabled when `NODE_ENV=development`.
7. Admin Orders UI transitions differ slightly from the server's state machine (e.g. cancel from COOKING), and the Dashboard "Add Tables" step is hard-coded to incomplete.

---

## 3. Target architecture

```mermaid
flowchart TB
    subgraph Clients
        ADM["🖥️ Admin Console<br/>(React)<br/>Super-admin + Restaurant admin"]
        STF["📟 Staff App<br/>(React, tablet)<br/>Kitchen board + Waiter mode"]
        CUS["📱 Customer Menu<br/>(React, mobile web)"]
    end

    subgraph API["Backend (Express + TypeScript, modular monolith)"]
        GW["HTTP API /api/v1<br/>auth · rbac · tenant scope · rate limit · zod"]
        WS["Socket.IO<br/>JWT handshake, rooms"]
        subgraph Modules["Domain modules (dm/*)"]
            M1["identity<br/>users · staff · roles"]
            M2["restaurant<br/>onboarding · settings · tax"]
            M3["catalog<br/>menu · category · dish · discount"]
            M4["tables<br/>tables · QR tokens"]
            M5["sessions<br/>table sessions (TTL)"]
            M6["ordering<br/>orders · status machine"]
            M7["billing<br/>bills · invoice PDF · counters"]
            M8["reports<br/>earnings aggregates"]
        end
        BUS(["In-process event bus<br/>order.placed · order.status · bill.generated"])
    end

    subgraph Infra
        DB[(MongoDB)]
        CDN["Cloudinary<br/>images + QR PNGs"]
        G["Google OAuth"]
        JOB["Scheduler<br/>session expiry"]
    end

    ADM --> GW
    STF --> GW
    CUS --> GW
    STF <--> WS
    CUS <--> WS
    ADM <--> WS
    GW --> Modules
    Modules --> DB
    Modules --> BUS
    BUS --> WS
    M3 --> CDN
    M4 --> CDN
    M1 --> G
    JOB --> M5
```

**Key decisions**

| Decision | Why |
|---|---|
| Stay a **modular monolith** (one Express app, separate `dm/*` modules talking via function calls + a small in-process event bus) | Small team and low traffic; modules can be split out later because they don't share models directly. |
| **3 front-ends**: Admin, Staff (kitchen + waiter), Customer | The kitchen app becomes the Staff app with a login and two modes. Keeps the app count the same. |
| **Every tenant-owned document carries `restaurantId`**; a `tenantScope` middleware puts it on `req` and every DM query filters by it | Fixes gap #1 structurally rather than with per-route checks. |
| **Money in integer paise** | Avoids rounding errors in bills/tax. |
| Customer is **anonymous by default** (session token), SSO optional | Ordering shouldn't need a login; SSO can be added for order history/loyalty. |

---

## 4. Roles & permissions

| Capability | Super Admin | Restaurant Admin | Kitchen | Waiter | Customer (session) |
|---|:-:|:-:|:-:|:-:|:-:|
| Onboard / suspend restaurant | ✅ | | | | |
| Restaurant settings, GPS, tax | | ✅ | | | |
| Menu / dish / discount | | ✅ | | | |
| Tables, QR generate / rotate | | ✅ | | | |
| Add / remove staff | | ✅ | | | |
| See kitchen board, change cooking status | | ✅ | ✅ | | |
| Place order for a table | | ✅ | | ✅ | ✅ (own table) |
| Mark delivered, request bill | | ✅ | | ✅ | |
| Generate / print / void bill | | ✅ | | ✅ (generate/print) | |
| View & download own bill | | | | | ✅ |
| Earnings & reports | ✅ (platform) | ✅ | | | |

Implementation: `User.platformRole` (`SUPER_ADMIN` or none) + `StaffMembership { userId, restaurantId, role: ADMIN | KITCHEN | WAITER }`. JWT carries `userId`, `restaurantId`, `role`. Middleware: `requireAuth → requireRole([...]) → tenantScope`.

**Staff login:** Admins use Google SSO. Kitchen/waiters may not have Google accounts → support **restaurant code + username + PIN** (hashed with bcrypt) as a second login method. *(Open question – see §10.)*

---

## 5. Data model (target)

New entities/fields are marked **NEW**.

```mermaid
erDiagram
    USER ||--o{ STAFF_MEMBERSHIP : has
    RESTAURANT ||--o{ STAFF_MEMBERSHIP : employs
    RESTAURANT ||--|| MENU : has
    MENU ||--o{ CATEGORY : contains
    CATEGORY ||--o{ DISH : contains
    RESTAURANT ||--o{ TABLE : has
    TABLE ||--o{ TABLE_SESSION : hosts
    TABLE_SESSION ||--o{ ORDER : groups
    TABLE_SESSION ||--o| BILL : "settled by"
    ORDER ||--|{ ORDER_ITEM : contains
    RESTAURANT ||--o{ COUNTER : "bill no. sequence"

    USER {
        ObjectId _id
        string googleId
        string email
        string platformRole "NEW: SUPER_ADMIN or null"
    }
    STAFF_MEMBERSHIP {
        ObjectId userId "NEW entity"
        ObjectId restaurantId
        string role "ADMIN KITCHEN WAITER"
        string username
        string pinHash
        bool isActive
    }
    RESTAURANT {
        ObjectId _id
        string name
        object gps
        int gpsRadiusMeters
        string status "NEW: PENDING ACTIVE SUSPENDED"
        object taxConfig "NEW: gstPercent, serviceChargePercent, inclusive"
        int sessionTtlMinutes "NEW: default 60"
    }
    DISH {
        ObjectId _id
        string name
        int pricePaise "CHANGED: integer paise"
        object discount "NEW: type PERCENT or FLAT, value, validFrom, validTo, isActive"
        bool isAvailable
    }
    TABLE {
        ObjectId _id
        int tableNumber
        string qrToken "NEW: random, unique, rotatable"
        int qrVersion "NEW"
        bool isActive
        ObjectId currentSessionId "NEW"
    }
    TABLE_SESSION {
        ObjectId _id "NEW entity"
        ObjectId restaurantId
        ObjectId tableId
        string status "OPEN BILL_REQUESTED BILLED CLOSED EXPIRED"
        date openedAt
        date lastActivityAt
        date expiresAt
    }
    ORDER {
        ObjectId _id
        ObjectId sessionId "NEW"
        string placedByType "NEW: CUSTOMER or WAITER"
        ObjectId placedById "NEW"
        string status
        int subtotalPaise
        int discountPaise "NEW"
        int totalPaise
    }
    ORDER_ITEM {
        ObjectId dishId
        string dishName
        int qty
        int unitPricePaise "list price snapshot"
        int unitDiscountPaise "NEW snapshot"
        int finalUnitPricePaise "NEW"
    }
    BILL {
        ObjectId _id "NEW entity"
        ObjectId sessionId
        string billNumber "e.g. R12-2026-000123"
        array lines "aggregated items from non-cancelled orders"
        int subtotalPaise
        int discountPaise
        int taxPaise
        int serviceChargePaise
        int roundOffPaise
        int grandTotalPaise
        string status "DRAFT FINAL PAID VOID"
        string paymentMode "CASH UPI CARD"
        date paidAt
    }
    COUNTER {
        ObjectId restaurantId "NEW: atomic $inc for bill numbers"
        int seq
    }
```

**Discount rule:** `finalUnitPrice = max(0, price − (PERCENT ? price × value / 100 : value))`, applied only when `discount.isActive` and within `validFrom..validTo`. The customer UI shows ~~price~~ **finalUnitPrice**. The order item stores a **snapshot**, so later price changes don't alter past bills.

---

## 6. Key flows

### 6.1 Scan → session → order → kitchen → bill

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant M as Customer App
    participant API as API
    participant K as Staff App (Kitchen)
    participant W as Staff App (Waiter)

    C->>M: Scan QR (/t/{qrToken})
    M->>API: POST /session/join {qrToken, gps}
    API->>API: Resolve token → table (active?), GPS check
    API->>API: Reuse OPEN session for table or create one (TTL 60m)
    API-->>M: sessionToken (JWT, scope = sessionId) + menu
    C->>M: Add items, view cart (strikethrough prices)
    M->>API: POST /order/place (sessionToken)
    API->>API: Re-price from DB, apply discounts, rate-limit
    API-->>K: socket order.placed (room kitchen:{rid})
    API-->>M: 201 order
    K->>API: PATCH status CONFIRMED → COOKING → READY
    API-->>W: socket order.ready (room staff:{rid})
    API-->>M: socket order.status (room session:{sid})
    W->>API: PATCH status DELIVERED
    Note over C,M: Customer can place more orders in the same session
    C->>M: "Request bill"
    M->>API: POST /session/requestBill
    API-->>W: socket bill.requested
    W->>API: POST /bill/generate {sessionId}
    API->>API: Aggregate non-cancelled orders, tax, bill no. ($inc)
    API-->>M: socket bill.ready → View / download PDF
    W->>API: POST /bill/markPaid {mode: CASH or UPI}
    API->>API: Session CLOSED, table.currentSessionId = null
```

### 6.2 Table session lifecycle (customer TTL ≈ 1 hour)

```mermaid
stateDiagram-v2
    [*] --> OPEN: first scan / waiter opens table
    OPEN --> OPEN: order placed or scan (slides expiresAt)
    OPEN --> BILL_REQUESTED: customer or waiter requests bill
    BILL_REQUESTED --> OPEN: customer adds more
    BILL_REQUESTED --> BILLED: bill generated (no new orders)
    BILLED --> CLOSED: marked paid
    OPEN --> EXPIRED: idle past TTL and no active orders
    EXPIRED --> [*]
    CLOSED --> [*]
```

- Sliding TTL: `expiresAt = lastActivityAt + restaurant.sessionTtlMinutes`.
- A session with un-billed delivered orders **never silently expires**. The scheduler flags it to staff ("Table 4 left without bill?") instead.
- Multiple phones at one table share the same session (and order list). Each phone keeps its own cart.

### 6.3 Order status (existing machine, kept)

```mermaid
stateDiagram-v2
    [*] --> PLACED
    PLACED --> CONFIRMED
    PLACED --> CANCELLED
    CONFIRMED --> COOKING
    COOKING --> READY
    READY --> DELIVERED
    PLACED --> CANNOT_DELIVER
    CONFIRMED --> CANNOT_DELIVER
    COOKING --> CANNOT_DELIVER
    READY --> CANNOT_DELIVER
    CONFIRMED --> CANCELLED
    COOKING --> CANCELLED
    DELIVERED --> [*]
    CANCELLED --> [*]
    CANNOT_DELIVER --> [*]
```

Only `DELIVERED` orders (configurable: also `READY`) go into the bill.

### 6.4 QR invalidation

- The QR encodes `{QR_BASE_URL}/t/{qrToken}`: a 22-character random token, not database IDs.
- **Rotate** = new `qrToken`, `qrVersion++` and a new PNG. Old prints immediately return *"This QR is no longer valid, ask staff"*.
- **Deactivate table** = `isActive=false`. Scans are rejected and nothing is deleted, so order history stays.

---

## 7. API surface (additions / changes)

Keep the existing verb-style naming. Every staff route is `requireAuth + requireRole + tenantScope`.

| Module | Endpoint | Role |
|---|---|---|
| **platform** | `POST /platform/onboardRestaurant` `{name, ownerEmail}` · `PATCH /platform/setRestaurantStatus/:id` · `GET /platform/listRestaurants` | SUPER_ADMIN |
| **staff** | `POST /staff/invite` · `GET /staff/list` · `PATCH /staff/update/:id` · `DELETE /staff/remove/:id` · `POST /auth/pinLogin` | ADMIN (pinLogin: public) |
| **dish** | `PATCH /dish/setDiscount/:id` `{type, value, validFrom?, validTo?}` · `DELETE /dish/clearDiscount/:id` | ADMIN |
| **table** | `POST /table/rotateQr/:id` · `PATCH /table/setActive/:id` · `GET /table/getLiveStatus` (free / occupied / bill requested) | ADMIN, WAITER (read) |
| **session** | `POST /session/join` `{qrToken, gps}` · `GET /session/me` · `POST /session/requestBill` · `POST /session/open` (waiter) · `POST /session/close/:id` | CUSTOMER / WAITER |
| **order** | `POST /order/place` (sessionToken **or** waiter JWT) · `GET /order/listMine` (session) · `GET /order/listBySession/:sid` · `GET /order/getKitchenOrders` (now authed) · `PATCH /order/setStatus/:id` | mixed |
| **bill** | `POST /bill/generate` `{sessionId}` · `GET /bill/get/:id` · `GET /bill/pdf/:id` · `GET /bill/print/:id` (80mm thermal HTML) · `POST /bill/markPaid/:id` · `POST /bill/void/:id` · `GET /bill/mine` (customer) | ADMIN, WAITER, CUSTOMER |
| **reports** | `GET /reports/earnings?from&to&groupBy=day,week,month` · `GET /reports/topDishes` · `GET /reports/byTable` · `GET /reports/byWaiter` | ADMIN |

**Socket rooms:** `kitchen:{restaurantId}`, `staff:{restaurantId}`, `session:{sessionId}`. The handshake requires a JWT (staff) or a session token (customer), and the server picks the rooms, so the client can't join any room it likes.

**Earnings** = Mongo aggregation over `BILL` where `status = PAID`, indexed on `{restaurantId, paidAt}`. Results can be cached per day once a day is over.

---

## 8. Anti-spam & security

| Threat | Mitigation |
|---|---|
| Ordering from home with a photographed QR | Rotatable `qrToken` + GPS radius + order only with a valid **session token**. Optional *"first order of a session needs staff confirm"* toggle. |
| GPS spoofing | Treat GPS as a signal, not proof. Add per-session/IP rate limits, a max of N active orders per session, and staff confirmation. |
| Cross-tenant access | `tenantScope` middleware plus `restaurantId` in every DM query. Integration tests that try cross-tenant reads. |
| Price tampering | Server always re-prices from the DB (already done ✅). |
| Kitchen/board data leak | Kitchen board needs a staff login (PIN) or a long-lived **device token** issued by the admin. |
| Bill tampering | Bills are immutable once `FINAL`. Corrections = `VOID` + new bill (audit trail). |

---

## 9. Roadmap — build piece by piece

```mermaid
flowchart LR
    classDef p0 fill:#ffd6d6,stroke:#c62828
    classDef p1 fill:#ffe9c4,stroke:#ef6c00
    classDef p2 fill:#fff3c4,stroke:#f9a825
    classDef p3 fill:#d7ecff,stroke:#1565c0

    P0["Phase 0<br/>Hardening<br/>tenant scope · paise · tests"]:::p0
    P1["Phase 1<br/>Roles & onboarding<br/>super admin · staff · PIN login"]:::p1
    P2["Phase 2<br/>Discounts<br/>strikethrough"]:::p1
    P3["Phase 3<br/>QR tokens<br/>rotate · deactivate"]:::p1
    P4["Phase 4<br/>Table sessions<br/>multi-order · my orders · live status"]:::p2
    P5["Phase 5<br/>Billing<br/>Bill entity · tax · print · download"]:::p2
    P6["Phase 6<br/>Staff app<br/>kitchen actions · waiter mode"]:::p2
    P7["Phase 7<br/>Earnings & reports"]:::p3
    P8["Phase 8<br/>Nice-to-have<br/>payments · call waiter · customer SSO"]:::p3

    P0 --> P1
    P0 --> P2
    P0 --> P3
    P3 --> P4
    P2 --> P5
    P4 --> P5
    P1 --> P6
    P4 --> P6
    P5 --> P7
    P6 --> P8
    P7 --> P8
```

| Phase | Scope | Done when |
|---|---|---|
| **0 – Hardening** | Restructure into service modules per [SERVICE_BOUNDARIES.md](./SERVICE_BOUNDARIES.md) §8; `tenantScope` + ownership on every route; money → paise (migration script); auth on kitchen/table-order endpoints; fix customer "order again" UX; add Jest + supertest + mongodb-memory-server | Cross-tenant test suite passes; customer can place 2 orders without a reload |
| **1 – Roles & onboarding** | `platformRole`, `StaffMembership`, `requireRole`; super-admin pages in Admin app (onboard / suspend); staff invite + PIN login | Super admin onboards a restaurant; owner adds a waiter who can log in |
| **2 – Discounts** | Dish `discount` schema, `setDiscount` API, Menu Builder UI, customer strikethrough, order snapshot fields | Discounted dish shows ~~₹200~~ ₹150 and the order stores both |
| **3 – QR tokens** | `qrToken`/`qrVersion`, `/t/{token}` route, rotate + deactivate UI, migrate existing tables | An old QR stops working after rotation |
| **4 – Table sessions** | `TableSession` model, `/session/*`, customer session token, sliding TTL scheduler, "My orders" screen, socket `session:{id}` instead of polling, live table grid for staff | Two phones at a table see the same orders; idle session expires |
| **5 – Billing** | `Bill` + `Counter`, tax config, generate / markPaid / void, PDF + 80mm print view, customer "View bill / Download" | Bill excludes cancelled orders, numbers are sequential, table frees up after payment |
| **6 – Staff app** | Kitchen app → Staff app with login; kitchen can move statuses; waiter mode: table grid, order for table, ready alerts, request/print bill | Waiter takes an order for a table without a phone scan |
| **7 – Earnings** | Reports APIs + Admin dashboard charts (revenue by day, top dishes, by table/waiter, avg bill) | Dashboard numbers match the sum of paid bills |
| **8 – Later** | Online payment (Razorpay/UPI intent), "call waiter" button, customer Google SSO + history, multi-branch, push notifications | — |

Each phase is shippable on its own and keeps the current layering (`routes → validators → controllers → dm`).

---

## 10. Open questions (need a decision before the matching phase)

1. **Staff login** (Phase 1): Google SSO for everyone, or Google for admins + PIN for kitchen/waiters?
2. **Customer SSO** (Phase 4/8): required, optional, or later?
3. **Bill inclusion** (Phase 5): only `DELIVERED` orders, or `READY` too?
4. **Tax** (Phase 5): GST-inclusive or exclusive menu prices? Service charge?
5. **First-order confirmation** (Phase 4): should staff confirm the first order of each session to block spam?
6. **Payments** (Phase 8): stay with manual "mark paid" for now?
