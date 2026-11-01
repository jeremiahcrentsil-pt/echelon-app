# Echelon

Client coaching platform for workouts, nutrition, check-ins, libraries, and progress tracking — with coach tools, credentials auth, Postgres (production) / SQLite (local fallback), and Resend invite email.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- NextAuth (credentials)
- Prisma · **PostgreSQL in production** (SQLite optional locally)
- Resend for coach → client invite emails (copy-link fallback)

## Run locally (recommended: Postgres)

1. Create a free Postgres database ([Neon](https://neon.tech) or [Supabase](https://supabase.com)).
2. Copy env and fill connection strings:

```bash
cp .env.example .env
# Set DATABASE_URL + DIRECT_URL (Neon: pooled → DATABASE_URL, direct → DIRECT_URL)
# Set AUTH_SECRET=$(openssl rand -base64 32)
```

3. Install, migrate, seed, run:

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

### Local SQLite fallback

If you prefer zero cloud DB for demos:

```bash
# .env
DATABASE_URL="file:./dev.db"

npm run db:sqlite:generate
npm run db:sqlite:push
DATABASE_URL="file:./dev.db" npx tsx prisma/seed.ts
npm run dev
```

Keep `prisma/schema.sqlite.prisma` in sync when changing models. Production always uses `prisma/schema.prisma` (Postgres).

### Demo sign-in

| Role   | Email                     | Password    |
| ------ | ------------------------- | ----------- |
| Coach  | `jeremiah@echelon.local`  | `coach123`  |
| Client | `alex@example.com`        | `client123` |
| Client | `sam@example.com`         | `client123` |

### Invites + onboarding

1. Coach → **Clients** (`/coach/clients`) → name + email → Create invite.
2. With `RESEND_API_KEY` + `INVITE_FROM_EMAIL`, the client gets an email. Without them (or on provider error), the invite URL is logged and shown for copy/paste.
3. Client opens `/invite/<token>`, sets a password, completes `/onboarding`.

## Deploy to Vercel (production-ready)

This repo is Vercel-friendly (`vercel.json` runs `npm run vercel-build` = generate → `prisma migrate deploy` → `next build`).

### 1. Database (Neon example)

1. Create a Neon project + database.
2. Copy **pooled** connection string → `DATABASE_URL`.
3. Copy **direct** connection string → `DIRECT_URL`.
4. Ensure `?sslmode=require` is present.

Supabase: use the connection pooler URL for `DATABASE_URL` and the direct DB URL for `DIRECT_URL`.

### 2. Vercel project

1. Import `jeremiahcrentsil-pt/echelon-app` in Vercel.
2. Framework preset: Next.js (from `vercel.json`).
3. Add environment variables (Production + Preview as needed) — see checklist below.
4. Deploy. First deploy runs migrations via `prisma migrate deploy`.
5. Seed once (optional) from your machine against the prod DB:

```bash
DATABASE_URL="…" DIRECT_URL="…" npx prisma db seed
```

### 3. Resend (invite email)

1. Create a [Resend](https://resend.com) account + API key.
2. Verify a sending domain (or use Resend’s onboarding sender for tests).
3. Set `RESEND_API_KEY` and `INVITE_FROM_EMAIL` (e.g. `Echelon <onboarding@yourdomain.com>`).
4. Set `APP_BASE_URL` / `AUTH_URL` to the production `https://…` URL so invite links are correct.

Without Resend keys, invites still work via **copy-link mode** in Coach → Clients.

### Secrets Jeremiah must add (exact)

| Name | Required | Example / notes |
| ---- | -------- | --------------- |
| `DATABASE_URL` | **Yes** | Neon/Supabase pooled Postgres URL (`postgresql://…?sslmode=require`) |
| `DIRECT_URL` | **Yes** | Neon/Supabase direct URL (same as `DATABASE_URL` if no pooler) |
| `AUTH_SECRET` | **Yes** | `openssl rand -base64 32` |
| `AUTH_URL` | **Yes** | `https://your-app.vercel.app` (or custom domain) |
| `NEXTAUTH_URL` | Recommended | Same as `AUTH_URL` |
| `APP_BASE_URL` | Recommended | Same public site URL (invite links) |
| `RESEND_API_KEY` | For real email | `re_…` from Resend |
| `INVITE_FROM_EMAIL` | For real email | `Echelon <onboarding@yourdomain.com>` |
| `S3_BUCKET` | Progress photos (prod) | Bucket name for S3 / R2 / MinIO |
| `S3_ACCESS_KEY_ID` | Progress photos (prod) | Access key |
| `S3_SECRET_ACCESS_KEY` | Progress photos (prod) | Secret key |
| `S3_REGION` | Progress photos (prod) | e.g. `auto` (R2) or `us-east-1` |
| `S3_ENDPOINT` | R2 / MinIO | R2 account endpoint or `http://127.0.0.1:9000` |
| `S3_FORCE_PATH_STYLE` | MinIO | Set `true` for local MinIO |
| `S3_PUBLIC_BASE_URL` | Optional | Public/CDN base so images skip the API proxy |
| `PROGRESS_PHOTOS_STORAGE_DIR` | Local fallback | Defaults to `./storage` when S3_* unset (keys under `progress-photos/`) |
| `SEED_COACH_PASSWORD` | Optional | Only if re-seeding prod |
| `SEED_CLIENT_PASSWORD` | Optional | Only if re-seeding prod |

Live deploy cannot be finished in-agent without Jeremiah’s Vercel/Neon/Resend (and ideally R2/S3) accounts.

### Progress photos storage

Client compresses JPEGs in-browser, then `POST /api/progress-photos` puts the bytes in **object storage** and stores only `objectKey` + `url` in Prisma.

- **Prod:** set the `S3_*` variables (AWS S3, Cloudflare R2, or MinIO).
- **Local/dev:** leave `S3_*` unset → files under `storage/progress-photos/<userId>/…` (gitignored), served via authenticated `/api/progress-photos/object?key=…`.
- Timeline + compare UI is unchanged; images load from `photo.url`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server (port 43127) |
| `npm run build` | `prisma generate` + Next build |
| `npm run vercel-build` | Generate + migrate deploy + build (Vercel) |
| `npm run start` | Serve production build |
| `npm run db:migrate` | `prisma migrate deploy` (Postgres) |
| `npm run db:migrate:dev` | `prisma migrate dev` |
| `npm run db:seed` | Seed coach + clients + default questionnaire |
| `npm run db:sqlite:*` | Local SQLite generate/push helpers |

## What persists

Users (coach/client), invites, questionnaires, workouts, nutrition, check-ins, monitoring, meal/workout plans, content, favorites, progress photos — in Postgres (prod) or SQLite (local fallback).
