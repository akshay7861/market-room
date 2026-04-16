# Production Hosting Runbook: Option 2

## Target

Host Market Room as a real website while keeping Admin always online but private.

## Current deployment status

As of 2026-04-14, the first free-hosted deployment is live:

| Surface | Current URL | Status |
|---|---|---|
| Public web app | `https://a97e4ee0.market-room-web.pages.dev` | Live |
| Private admin web app | `https://a69d479d.market-room-admin.pages.dev` | Live, but must still be protected by Cloudflare Access |
| Backend API | `https://market-room-api.akshay-market-room.workers.dev` | Live |
| API health | `https://market-room-api.akshay-market-room.workers.dev/api/health` | `200 OK`, D1 connected |
| Hosted admin API | `https://market-room-api.akshay-market-room.workers.dev/api/admin/*` | Locked with `403` until Access is configured |

Important: the admin Pages URL currently serves the frontend, but admin API mutation/read endpoints are blocked for hosted traffic by `ADMIN_API_ENABLED=false`. Configure Cloudflare Access before enabling hosted admin API access.

## Recommended free-tier architecture

| Surface | URL | Cloudflare product | Public? | Notes |
|---|---|---:|---:|---|
| Public web app | `https://market-room.pages.dev` or custom domain | Cloudflare Pages | Yes | Build with `VITE_ENABLE_ADMIN=false` |
| Private admin web app | `https://market-room-admin.pages.dev` or `https://admin.<domain>` | Cloudflare Pages + Cloudflare Access | No | Build with `VITE_ENABLE_ADMIN=true` |
| Backend API | `https://market-room-api.<account>.workers.dev` or `https://api.<domain>` | Cloudflare Workers | Partly | Public routes open, admin routes protected |
| Database | Cloudflare D1 | Cloudflare D1 | No | Production D1, not local Miniflare DB |

## Why this is free enough for MVP

Cloudflare provides free tiers for Pages, Workers, D1, and Zero Trust/Access. This is enough for an MVP, demos, admin workflows, scheduled checks, and low-volume public Ask Market usage. The first paid pressure point is likely LLM/API usage, not hosting.

## Current repo readiness

- Frontend already uses `VITE_API_BASE_URL`.
- Admin route is now controlled by `VITE_ENABLE_ADMIN`.
- Backend is already a Cloudflare Worker.
- D1 binding already exists in `apps/api/wrangler.jsonc`, but `database_id` must be replaced with the real production D1 ID.
- Wrangler is installed, but this machine is not authenticated yet. Run `npx wrangler login` before deployment.

## Production build settings

### Public Pages project

Project name:

```text
market-room-web
```

Root directory:

```text
apps/web
```

Build command:

```text
npm run build
```

Build output directory:

```text
dist
```

Environment variables:

```text
VITE_API_BASE_URL=https://<api-worker-url>
VITE_ENABLE_ADMIN=false
```

Expected result:

- `/`, `/live-market`, `/market-room`, `/ask-market`, and `/agents` are usable.
- `/admin` is not registered in the public build.
- Admin does not appear in the nav.

### Private Admin Pages project

Project name:

```text
market-room-admin
```

Root directory:

```text
apps/web
```

Build command:

```text
npm run build
```

Build output directory:

```text
dist
```

Environment variables:

```text
VITE_API_BASE_URL=https://<api-worker-url>
VITE_ENABLE_ADMIN=true
```

Protection:

- Put the whole admin Pages hostname behind Cloudflare Access.
- Allow only your email address.
- Do not rely on hidden navigation alone.
- After Access is protecting both the admin Pages app and admin API paths, change `ADMIN_API_ENABLED` to `"true"` in `apps/api/wrangler.jsonc` and redeploy the Worker.

Expected result:

- Admin is always online.
- Admin is not available unless Cloudflare Access login succeeds.

## Backend Worker setup

### 1. Authenticate Wrangler

```bash
npx wrangler login
npx wrangler whoami
```

### 2. Create production D1

```bash
npx wrangler d1 create market-room-db
```

Copy the returned `database_id` into:

```text
apps/api/wrangler.jsonc
```

### 3. Apply migrations remotely

```bash
npm run db:init:remote
```

or, if applying directly:

```bash
cd apps/api
npx wrangler d1 migrations apply market-room-db --remote
```

### 4. Set Worker secrets

Set only the secrets you actually use:

```bash
cd apps/api
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put MARKETAUX_API_KEY
npx wrangler secret put FRED_API_KEY
npx wrangler secret put EIA_API_KEY
npx wrangler secret put BEA_API_KEY
npx wrangler secret put CENSUS_API_KEY
npx wrangler secret put TWELVE_DATA_API_KEY
npx wrangler secret put ALPHA_VANTAGE_API_KEY
npx wrangler secret put GEMINI_API_KEY
```

### 5. Deploy Worker

```bash
npm run build --workspace @market-room/api
cd apps/api
npx wrangler deploy
```

### 6. Verify API

```bash
curl https://<api-worker-url>/api/health
```

Pass condition:

```json
{
  "ok": true,
  "database": "connected"
}
```

## Admin route protection

Protect these with Cloudflare Access:

```text
https://market-room-admin.pages.dev/*
https://<api-worker-url>/api/admin/*
https://<api-worker-url>/api/discussions/run
https://<api-worker-url>/api/scheduler/run
```

For the current deployment, use:

```text
https://a69d479d.market-room-admin.pages.dev/*
https://market-room-api.akshay-market-room.workers.dev/api/admin/*
https://market-room-api.akshay-market-room.workers.dev/api/discussions/run
https://market-room-api.akshay-market-room.workers.dev/api/scheduler/run
```

Keep these public or semi-public:

```text
/api/health
/api/agents
/api/live-market
/api/market-room
/api/market-questions
```

## Immediate blocker

Wrangler is not logged in on this machine yet.

Run:

```bash
npx wrangler login
```

Then deployment can proceed.

## First validation after deploy

1. Public web opens without Admin in nav.
2. Public `/admin` does not render Admin.
3. Admin hostname asks for Cloudflare Access login.
4. Admin loads after your email is approved.
5. API health returns `database: connected`.
6. Ask Market works from the public site.
7. Admin knowledge page can read approved docs.
8. Public user cannot call `/api/admin/*`.
