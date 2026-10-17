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

Run ThinkTechErpAPI with its `http` launch profile (`http://localhost:5291`). If you use the `https`
profile, set `API_BASE_URL=https://localhost:7071` and start Node with `NODE_USE_SYSTEM_CA=1` so it
trusts the ASP.NET dev certificate. The client never follows API redirects (they would drop the
`Authorization` header); a redirect shows up as an error telling you to fix `API_BASE_URL`.

### Signing in

ThinkTechErpAPI only *validates* JWTs today (HS256, `sub` + `jti` required, roles in the `role` claim);
it has no endpoint that issues them. Two modes are supported:

- **`AUTH_MODE=api`** (default) — the login form posts `{ userName, password }` to
  `AUTH_LOGIN_PATH` (default `/api/security/auth/login`) and expects `{ "accessToken": "<jwt>" }`.
  Logout calls `AUTH_LOGOUT_PATH` best-effort.
- **`AUTH_MODE=dev`** — local development only (disabled in production builds). The credentials in
  `DEV_AUTH_USERNAME` / `DEV_AUTH_PASSWORD` are checked locally and a JWT is minted with
  `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE` / `AUTH_JWT_SIGNING_KEY` and the roles in `DEV_AUTH_ROLES`.
  **Copy those three JWT values from the API's configuration** (user secrets
  `Authentication:Jwt:*`) so the API accepts the tokens.

The token lives only in an **httpOnly cookie** (`tt_session`). All API calls are made server-side
(Server Components and Server Actions) with `Authorization: Bearer …`, so the token never reaches
browser JavaScript. When the API answers 401 the session is cleared and the user is sent to
`/login?expired=1`.

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

## Security API contract (to implement in ThinkTechErpAPI)

`Areas/Security` in the API is empty. The client is built against these endpoints; until they exist
the Security screens show "Not implemented".

| Method | Path | Body → Response |
| --- | --- | --- |
| POST | `/api/security/auth/login` (anonymous) | `{ userName, password }` → `{ accessToken }` (JWT with `sub`, `jti`, `name`, `email`, `role`[], optional `client_id`) |
| POST | `/api/security/auth/logout` | — → 204 (revoke the token's `jti`) |
| GET | `/api/security/users?limit&offset&search` | → `SecurityUser[]` |
| GET | `/api/security/users/{userId}` | → `SecurityUser` |
| POST | `/api/security/users` | `{ userName, email, displayName, password, isActive, roles[] }` → `SecurityUser` |
| PUT | `/api/security/users/{userId}` | `{ email, displayName, isActive, roles[] }` → `SecurityUser` |
| POST | `/api/security/users/{userId}/password` | `{ newPassword }` → 204 |
| GET | `/api/security/roles` | → `SecurityRole[]` |
| GET | `/api/security/roles/{roleId}` | → `SecurityRole` |
| POST / PUT | `/api/security/roles[/{roleId}]` | `{ name, description, permissions[] }` → `SecurityRole` |
| DELETE | `/api/security/roles/{roleId}` | → 204 |

`SecurityUser = { userId, userName, email, displayName, isActive, roles[], createdAt, lastLoginAt }`,
`SecurityRole = { roleId, name, description, permissions[], userCount, isSystem }` (camelCase JSON).
Validation errors as ASP.NET `ValidationProblemDetails` or `{ "error": "…" }` are shown on the forms.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
