# ThinkTechErp — Admin Client

Modular ERP administration console for **ThinkTechErpAPI** (ASP.NET Core 10), built with
**Next.js 16.4** (App Router, Cache Components, Partial Prefetching), **React 19.3** and **Tailwind CSS v4**
in a TailAdmin-style layout (collapsible sidebar, dark mode, responsive).

| Module | Status | API |
| --- | --- | --- |
| Security | Login/logout working; users & roles screens ready | `/api/security/*` — **not implemented in the API yet** (see contract below) |
| SMS | Complete | `SmsAdminController`, `SmsClientController` |
| WebSite | Complete (generic editor for all 11 tables) | `WebsiteTablesController` |
| Inventory, Purchase, Accounting | Registered placeholders | — |

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit it
npm run dev                  # http://localhost:3000
```

Locally, point `API_BASE_URL` at the API's plain-HTTP port `http://localhost:5291` (both launch
profiles listen there, and the API skips its HTTPS redirect in Development). The calls are
server-to-server, and Node rejects the ASP.NET development certificate even with the system CA store
when Windows holds several `CN=localhost` certificates. The client never follows API redirects (they
would drop the `Authorization` header); a redirect shows up as an error telling you to fix `API_BASE_URL`.

### Signing in

The default `AUTH_MODE=api` sends `{ email, password }` to
`AUTH_LOGIN_PATH` (default `/api/security/auth/login`). It reads the API's `accessToken`,
`refreshToken`, and `refreshTokenExpiresAt` response fields. The access token is stored in the
httpOnly `tt_session` cookie and used for server-side bearer requests. The refresh token is stored
in the httpOnly `tt_refresh` cookie and revoked through the API logout endpoint when the user signs
out.

The client trusts the access token the API returns (it only reads `sub` and `exp`); the API verifies
it on every call, so the client does not need the API's signing key. Access tokens are short-lived:
`proxy.ts` renews the session through `AUTH_REFRESH_PATH` (default `/api/security/auth/refresh`)
when the access token is missing or about to expire, so users stay signed in for the refresh
token's lifetime. Concurrent requests share one renewal, because the API rotates refresh tokens.

`AUTH_MODE=dev` remains available for local-only sign-in using `DEV_AUTH_USERNAME` /
`DEV_AUTH_PASSWORD` (it needs the `AUTH_JWT_*` values); it is disabled in production builds.

Roles: `admin` can open every module; otherwise each module lists its roles (SMS needs `sms_admin`,
matching the API's `SmsAdmin` policy; Security needs `security_admin`).

## Project structure

```
src/
  proxy.ts                 Route guard (Next 16's replacement for middleware)
  app/
    (auth)/login/          Sign-in page
    (admin)/               Authenticated shell: sidebar + header
      dashboard/  profile/
      security/  sms/  website/          Module routes (thin pages)
      inventory/ purchase/ accounting/   Placeholders
  core/                    Shared, module-agnostic code
    api/                   apiFetch (server-only, bearer token), ApiError, tryApi
    auth/                  session cookie, login/logout actions, JWT helpers, role checks
    forms/                 ActionForm + Server Action state, field components
    layout/                sidebar, header, user menu, ModuleGate
    modules/types.ts       ModuleDefinition
    ui/                    Card, Table, Badge, Alert, Pagination, skeletons…
  modules/
    registry.ts            The list of modules — drives sidebar, dashboard and role editor
    <module>/module.ts     Name, icon, routes, roles, permissions
    <module>/api.ts        Typed API client (server-only)
    <module>/actions.ts    Server Actions (mutations)
    <module>/components/   Module UI
```

### Adding a module

1. Create `src/modules/<name>/module.ts` with `defineModule({...})` and add it to `modules/registry.ts`.
   It now appears in the sidebar, dashboard, Security → Module access and the role editor's permissions.
2. Add `api.ts` (wrap `apiFetch`), `types.ts`, `actions.ts` and components under `src/modules/<name>/`.
3. Add routes under `src/app/(admin)/<name>/`, with a `layout.tsx` that wraps children in
   `<ModuleGate module={...}>` inside `<Suspense>` (see `sms/layout.tsx`).

### Cache Components conventions

Cache Components is on, so anything that reads the request (cookies, `params`, `searchParams`, API data)
must render inside `<Suspense>`. Pages render a static header and put data in a `<Suspense>` child —
follow the existing pages. API data is never cached (`cache: "no-store"`); mutations call `refresh()`
or `redirect()`.

## Security API contract

The security module uses these endpoints in ThinkTechErpAPI:

| Method | Path | Body → Response |
| --- | --- | --- |
| POST | `/api/security/auth/login` (anonymous) | `{ email, password }` → `AuthResponse` (`accessToken`, `refreshToken`, expiry times, user) |
| POST | `/api/security/auth/logout` | `{ refreshToken }` → 204 |
| POST | `/api/security/auth/refresh` (anonymous) | `{ refreshToken }` → `AuthResponse` (rotates the refresh token) |
| GET | `/api/security/auth/menus` | → the signed-in user's menu tree (drives the sidebar) |
| GET / POST / PUT | `/api/security/organizations[/{id}]` | `Organization` (no delete) |
| GET / POST / PUT / DELETE | `/api/security/permissions[/{id}]` | `{ code, name, description }`; code is `MODULE.ACTION`; 409 while in use |
| GET / POST / PUT / DELETE | `/api/security/roles[/{id}]` | `{ name, description, permissionIds[] }`; 409 while assigned |
| GET | `/api/security/users?search&status&limit&offset` | → `{ items, totalCount, limit, offset }` |
| GET / POST / PUT | `/api/security/users[/{id}]` | `{ name, email, password (create only), photoUrl, status, roleIds[] }` |
| PUT | `/api/security/users/{id}/password` | `{ newPassword }` → 204 |
| GET / PUT | `/api/security/users/{id}/permissions` | `{ permissionIds[] }` → `{ direct[], effective[] }` |
| GET / PUT | `/api/security/users/{id}/menus` | `{ menus: [{ menuId, canView, canCreate, canEdit, canDelete }] }` (per-user overrides) |
| GET | `/api/security/menus` | → every menu (for the menu-access editor) |

Ids are integers and JSON is camelCase; the types live in `src/modules/security/types.ts`. The
Security screens need the `SECURITY.V` permission in the access token (`SECURITY.M` to change data),
matching the API's `SecurityView` / `SecurityManage` policies; view-only users get read-only forms.
Validation errors as ASP.NET `ValidationProblemDetails` or `{ "error": "…" }` are shown on the forms.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
