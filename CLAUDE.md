# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LIFT is a training log built as a mobile-first PWA: Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Tailwind, with Supabase (Auth + Postgres + RLS) as the backend. It must work as an installed PWA in all major mobile and desktop browsers, so treat phone-sized, touch-driven use as the primary target. All UI text is Norwegian (bokmål), and code comments are in English.

The app has two real users with different training: one does strength training and the other mostly does cardio. Strength and cardio are both first-class, so never assume that a set means reps × weight.

## Commands

```bash
npm install          # also needed after pulling — prettier was added to devDependencies recently
npm run dev          # http://localhost:5173, bound to 0.0.0.0 (reachable from a phone on LAN / localtunnel)
npm run type-check   # vue-tsc --noEmit — currently passes clean; the main correctness gate
npm run build        # production build to dist/ (Netlify runs this; SPA fallback in netlify.toml)
npm run preview      # serve the built dist/
```

There is no test runner and no linter. Verify changes with `npm run type-check` and by running the app. (The README mentions `src/Test/`, but that directory does not exist.)

Prettier is configured in `.prettierrc.json` (no semicolons, single quotes, width 100, tailwind class sorting). So far only `src/App.vue` has been formatted with it, and the rest of the codebase mixes quote styles. Don't reformat whole files as a side effect of a change; ask first.

`.env.local` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If either is missing, `useSupabase` falls back to a mock client where every auth and DB call returns an error, so the app loads but you can't log in.

The service worker is enabled in dev (`devOptions.enabled` in `vite.config.ts`, output in `dev-dist/`). If changes don't show up in the browser, a cached SW is a likely cause. The app version is set in three places that must change together: `package.json`, and both `version` fields in `vite.config.ts`.

## Architecture

### Data layer (`src/composables/`)

Three layers. Views and components should use the top layer.

1. **`useSupabase`**: a module-level singleton Supabase client. All fetches have a 10s timeout. The session is stored in `localStorage` or `sessionStorage` depending on the `rememberMe` choice from Login (storage key `lift-auth`). `main.ts` calls `initSupabase()` before anything else.
2. **`useSupabaseData`**: a module-level singleton that owns `templates`, `sessions` and the current user, together with offline caching and sync. **`useExercises`**: separate module-level state for the exercise library, loaded straight from Supabase and *not* cached offline.
3. **`useHybridData`**: the facade that views call. It isn't a singleton itself, but it wraps the singletons, so it's cheap to call in any component. It adds exercise lookups (`getExerciseById`, `exerciseIndex`, `getFlattenedExercises`) and workout-type helpers from `src/data/workout-types.json`.

Boot order: `main.ts` → `initSupabase` → `useHybridData().initializeAuth()` (fire-and-forget: auth, IndexedDB, cached data, then exercises) → mount. `App.vue` shows a loader until initialisation finishes. The router guard in `src/router/index.ts` checks the Supabase session on every route unless `meta.requiresAuth === false`.

### Offline-first sync (`useSupabaseData` + `useIndexedDB`)

- IndexedDB database `LIFTDB` has two stores: `userData` (a per-user snapshot of templates, sessions and user) and `pendingChanges` (a queue of writes that failed).
- `loadData` reads the cache first. It only goes to the network when forced, or when 30 minutes have passed since the last sync, and **never while pending changes exist**. Sessions are fetched 300 per page, with the remaining pages backfilled in the background.
- Writes are optimistic: update the reactive state, write the IndexedDB snapshot, then call Supabase. If the Supabase call fails, the change goes into `pendingChanges` and is replayed when the app comes back online.
- Every mutation must also update the IndexedDB snapshot. Skipping it makes completed sessions show up as active again after the app reopens (see `fixed-bugs/CACHING_FIX_README.md`). The existing CRUD functions already do this, so follow their pattern.

### Data model

- `workout_templates` and `workout_sessions` have snake_case columns, with `exercises` stored as camelCase JSONB. The column-to-TypeScript mapping lives in `useSupabaseData` (`formatSessions` and the CRUD functions). Types are in `src/types/workout.ts`.
- `exercises` and `exercise_variants` hold the shared library. `user_id IS NULL` marks a global exercise. RLS on these two tables is deliberately open to every authenticated user (`09_`, `10_` SQL), so editing or deleting a library exercise affects both users.
- Profile data and training goals live in Supabase Auth `user_metadata`; there are no profile tables. Goals are also mirrored in `localStorage` (`useTrainingGoals`).
- Muscle groups and their colours come from `src/data/muscle-groups.json`. Category names are Norwegian (`Bryst`, `Rygg`, `Ben`, …), and cardio exercises use the category `Kondisjon`.

**Exercise ids:** an `exerciseId` stored in a session or template is an integer that refers to either an exercise (if it has no variants) or a variant. The two tables use separate `SERIAL` sequences, so the same number can be both an exercise id and a variant id. For bulk lookups (week or stats aggregation), use the `exerciseIndex` Map. `getExerciseById` scans the whole list on every call. Ids that can't be resolved are reported (see `unresolvedSets` in `useWeekStats`) and never matched by name.

### Strength vs cardio

- `trackingType: 'strength' | 'cardio'` is set on the library exercise. Variants inherit it from their parent. When a session starts, the value is copied onto each `WorkoutExercise`, so logged history stays correct if the library changes later. A missing value means `strength`, because sessions from before cardio support have none.
- **`useSetMetrics.ts` is the single source of truth** for when a set counts as logged or counted, and for its volume, reps, duration, distance and the display formatting. Use those helpers instead of computing `weight * reps` inline.
- Cardio goals are minutes and km per week, not sets (`useTrainingGoals`).

### Weekly view and goals

`useWeekStats` (ISO weeks starting Monday, labels `Man`…`Søn`) and `useTrainingGoals` (plans with weekly set targets per muscle group, plus cardio targets) power `TemplateSessions.vue` (home) and `WeekDetails.vue`. The week is the unit of progress. Rest days are planned, so don't add streaks or "days in a row" mechanics.

### Active workout (`src/views/WorkoutSession.vue`)

- When a session is completed, `cleanupSessionData` removes sets that don't pass `isSetCounted`, and exercises left with no sets, before saving (see `fixed-bugs/WORKOUT_CLEANUP_README.md`).
- Number inputs avoid `v-model.number`. Values are parsed by hand, with comma converted to dot, because the locale is Norwegian.
- The scroll position is saved under `workout-scroll-<id>` (session/local storage) and restored by `scrollBehavior` and `afterEach` in the router. Changes to one side need to match the other.

### PWA and styling

- `vite-plugin-pwa` uses `registerType: 'prompt'`. `src/sw.ts` dispatches `sw-update-available`, which `UpdateNotification.vue` uses to ask the user to reload. Supabase requests are cached NetworkFirst for 7 days.
- Tailwind adds custom `primary` (orange) and `dark` (slate) palettes. Shared component classes (`btn-primary`, `btn-secondary`, `btn-danger`, `card`, `input-field`) and the safe-area and PWA navigation rules are in `src/style.css`.
- **Read [DESIGN.md](DESIGN.md) before any UI work.** It defines the visual style that new and redesigned views follow (panels, colors, type scale, patterns), with `WeekDetails.vue` and `SessionDetails.vue` as the reference pages. The older `.card`-based views are listed there as known deviations, so don't copy their style.

## Database changes (`supabase-setup/`)

There is no migration tooling. The SQL files are numbered and run by hand in the Supabase SQL editor; a new change gets the next number (`13_…`). Some existing files are destructive: `04_` truncates all workouts and `11_` wipes the exercise library. Never run or suggest running them without explicit confirmation.

The Node scripts there (`node supabase-setup/<name>.mjs`) read `.env.local` and prompt for a login. `migrate-exercise-ids.mjs` is a dry run unless you pass `--apply`.

`supabase-setup/README.md` only covers `02_`/`03_`, and `JSON_DATA_STRUCTURE.md` describes a `src/data/exercises.json` that no longer exists (exercises now live in Supabase). Trust the SQL files and `src/types/workout.ts` over those docs.
