# QR Menu — Super Admin

Platform console for the QR Menu team (1–2 people). It lets you:

- See how many restaurants are onboarded, by status (pending / active / suspended / rejected).
- Review restaurant details: owner, address, GPS, menu and table setup, order totals, status history.
- **Approve** or **reject** onboarding requests.
- **Suspend** an active restaurant and **reactivate** it later.

Only `ACTIVE` restaurants can serve their customer menu and take orders. New restaurants start as
`PENDING_APPROVAL`; restaurants created before onboarding approval existed count as `ACTIVE`.

## Run

From the repo root, `npm run dev` starts the API, all apps and the dev gateway. Then open
**http://localhost:8080/super-admin/**.

The app is built with `base: '/super-admin/'`. On its own (`npm run dev` in this folder) it is also
reachable at `http://localhost:5176/super-admin/`, with `/api` proxied to the API server on `:5001`
(override the API URL with `VITE_API_BASE_URL`). See [gateway/README.md](../../gateway/README.md) for the
one-host setup and production reverse proxy.

## Access

Sign-in uses the same Google login as the restaurant admin app. Only emails listed in the
server's `SUPER_ADMIN_EMAILS` env variable (comma-separated) can use this app; everyone else
sees an "access denied" screen and the API returns 403.

## Structure

```
src/
├── constants/   routes, API endpoints, status labels/colours, copy
├── types/       API response types
├── services/    axios API calls (super-admin endpoints only)
├── context/     auth state (Google session + super admin check)
├── components/  Layout, StatusBadge, ReasonDialog
└── pages/       Login, AuthSuccess, Dashboard, Restaurants, RestaurantDetail
```

Server side lives in `server/src/services/super-admin/` (routes, controller, validators,
middleware, interfaces, constants) and calls the shared DM layer in `server/src/dm/`.
