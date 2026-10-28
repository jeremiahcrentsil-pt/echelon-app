# Echelon

Client coaching platform for workouts, nutrition, check-ins, libraries, and progress tracking. First slice: branded app shell plus workout logging with mock local data.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Local storage for workout persistence (no auth/DB yet)

## Run locally

```bash
npm install
npm run dev -- --port 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127). The home route redirects to **Workouts**.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start the development server |
| `npm run build`| Production build         |
| `npm run start`| Serve the production build |
| `npm run lint` | Run ESLint               |

## What’s in this slice

- Mobile-friendly **Echelon** shell with nav for all nine client modules
- **Workouts**: list seeded sessions, log a new workout (exercises, sets, reps, notes), empty/loading/error-friendly UI
- Placeholder pages for Nutrition, Scan, Check-ins, Meal plans, Exercises, Content, Monitoring, and Progress photos
