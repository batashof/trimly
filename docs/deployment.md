# Deployment

Two targets, both free tier, both auto-deploy from `main`:

- **API (NestJS)** → Render, provisioned by [`render.yaml`](../render.yaml).
- **Web (Next.js)** → Vercel, configured in the dashboard (root directory `apps/web`).

Deploy the **API first** — the web app needs its public URL. The database is the
existing Neon project (already migrated and seeded with the admin user), so both
environments point at the same `DATABASE_URL`; no separate prod seeding needed.

## 1. API on Render

1. Render dashboard → **New +** → **Blueprint** → connect this repo. Render reads
   `render.yaml` and creates the `trimly-api` web service (region: Frankfurt).
2. When prompted, fill the `sync: false` secrets from `apps/api/.env`:
   - `DATABASE_URL` — pooled Neon connection.
   - `DIRECT_URL` — direct Neon connection (used by `prisma migrate deploy` at build).
   - `JWT_SECRET` — the same long random string as local.
3. First deploy runs: `prisma generate` → `prisma migrate deploy` → `nest build`,
   then starts on Render's injected `$PORT`. Verify: `GET https://<service>.onrender.com/health`.

> The live service is **`https://trimly-api-npk6.onrender.com`**. Render appended
> `-npk6` because the plain `trimly-api.onrender.com` hostname was already taken —
> always copy the real URL from the service page, don't assume it matches the name.

> Free tier sleeps after 15 min idle (30–50 s cold start). Keep it warm for demos
> with an external pinger hitting `/health` every 10 min — see [architecture.md](architecture.md).

## 2. Web on Vercel

1. Vercel → **Add New** → **Project** → import this repo.
2. **Root Directory:** `apps/web` (Vercel auto-detects Next.js and pnpm workspace).
3. **Environment variable:** `NEXT_PUBLIC_API_URL` = the Render API URL from step 1
   (`https://trimly-api-npk6.onrender.com`). No trailing slash, and it **must**
   include the `https://` scheme — a value without a scheme (e.g. a bare host or IP)
   is treated as a relative path by the browser and every API call 404s off the
   Vercel origin. `NEXT_PUBLIC_*` is inlined at build time, so redeploy after changing it.
4. Deploy. The public page is at `/`, the admin console at `/admin`.

## Auto-deploy

Both platforms watch `main`: every merge triggers a redeploy. CORS on the API is
currently open (`enableCors()` in `apps/api/src/main.ts`) — tighten to the Vercel
origin before this is anything more than a portfolio demo.
