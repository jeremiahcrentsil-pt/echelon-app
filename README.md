# Echelon

Client coaching platform for workouts, nutrition, check-ins, libraries, and progress tracking — with coach tools, credentials auth, and SQLite persistence.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- NextAuth (credentials) · Prisma + SQLite

## Run locally

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

### Demo sign-in

| Role   | Email                     | Password   |
| ------ | ------------------------- | ---------- |
| Coach  | `jeremiah@echelon.local`  | `coach123` |
| Client | `alex@example.com`        | `client123` |
| Client | `sam@example.com`         | `client123` |

## Scripts

| Command              | Description                |
| -------------------- | -------------------------- |
| `npm run dev`        | Dev server (port 43127)    |
| `npm run build`      | Production build           |
| `npm run start`      | Serve production build     |
| `npm run lint`       | ESLint                     |
| `npm run db:migrate` | Prisma migrate             |
| `npm run db:seed`    | Seed coach + clients       |
| `npm run db:reset`   | Reset DB + reseed          |

## What persists

Per signed-in user in SQLite: workouts, nutrition entries, check-ins, monitoring, meal-plan completions, exercise favorites, saved content, progress photo metadata/blobs. Coach-created meal/workout plans and content posts are shared via assignment tables. Clients only see their own data; `/coach` requires the coach role.
