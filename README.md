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
- **Nutrition**: daily food log with calories/macros, meal grouping, localStorage persistence
- **Scan**: barcode lookup via Open Food Facts (+ mock fallback), optional camera, add to today’s nutrition log
- **Check-ins**: coach-assigned forms (weight, energy, sleep, adherence, notes) with submission history
- **Monitoring**: short daily pulse (steps, water, mood/readiness/sleep) with today status + recent history
- **Meal plans**: assigned weekly plan with daily meals/macros; mark eaten + adherence notes
- **Exercises**: searchable/filterable library with cues, demo placeholders, favorites
- **Content**: coach PDFs/videos/docs with categories, detail/open, optional saved items
- **Progress photos**: dated front/side/back tracker with compressed localStorage images, timeline + compare

## Client + coach MVP

Nine client modules plus a **Coach** area at `/coach` (assign plans, post content, review check-ins) using shared mock/localStorage data and two seeded clients. Auth and a real database are still out of scope.

Open [http://127.0.0.1:43127/coach](http://127.0.0.1:43127/coach) for coach tools; use the “Viewing as” switcher in the client shell to demo assignments.
