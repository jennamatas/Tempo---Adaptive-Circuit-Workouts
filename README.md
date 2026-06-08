# Tempo — Adaptive Circuit Workouts

**Train in rhythm.** Tempo builds a 20‑minute full‑body circuit around your level, times every round with a guided interval timer, logs every rep, and tracks your progress over time.

Built with **Expo (React Native)** + **expo-router** + **Supabase**. Runs on iOS, Android, and the web from one codebase.

## Features

- **Onboarding** — set fitness level, body weight, and weekly goal.
- **Workout generator** — pattern‑balanced 5‑exercise circuit (lower / push / pull / core / cardio), seeded shuffle, avoids your last 2 sessions, regenerate for variety.
- **Circuit timer** — drift‑free timestamp‑based countdown, get‑ready → work → rest loop, pause / skip / quit, in‑rest rep logger, **haptic cues** in the last 3 seconds and on transitions, and a **screen wake‑lock** so the phone stays awake mid‑workout.
- **History** — every completed session with a per‑exercise breakdown, filterable by phase.
- **Dashboard** — this‑week vs weekly goal, streak, lifetime totals, weekly volume, reps over time, body‑part balance, **personal records**, and recent sessions.
- **Exercise library** — searchable, filterable grid with detail pages (instructions, muscles worked, equipment).
- **Profile & settings** — edit level / body weight, view lifetime totals, sign out.
- **Auth** — email + password sign‑up / sign‑in, **forgot password**, persistent sessions.

## Phases

| Phase | Level | Work | Rest | Exercises/round | Rounds | Total |
|-------|-------|------|------|-----------------|--------|-------|
| Foundation | Beginner | 30s | 30s | 5 | 4 | 20 min |
| Build | Intermediate | 40s | 20s | 5 | 4 | 20 min |
| Peak | Advanced | 45s | 15s | 5 | 4 | 20 min |

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. (Optional) Point at your own Supabase project

   ```bash
   cp .env.example .env
   # fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```

   If you skip this, the app uses the bundled demo backend so it runs immediately.

3. Start the app

   ```bash
   npx expo start          # then press i / a / w for iOS, Android, or web
   # or: npm run ios | npm run android | npm run web
   ```

## Try it

The bundled demo backend ships with the full exercise library (32 active moves) already seeded, so the generator and library are populated immediately. To see the app end‑to‑end:

1. **Sign up** from the welcome screen (creates your profile automatically).
2. Complete onboarding, then **Generate today's circuit** and **Start**.
3. Run a couple of circuits — the dashboard charts, streak, and personal records fill in from your saved sessions.

> A fresh account starts on the empty‑state dashboard by design. Provisioning a pre‑seeded demo user with weeks of history requires the Supabase **service‑role** key (see the seed plan in `.claude/`), which is not bundled with the client.

## Database

The schema and seed data live in [`DB/database.sql`](DB/database.sql) (a Postgres dump). Tempo uses a compact, denormalised model:

- `exercises` — name, slug, body_part, phase, movement_pattern, muscle_groups, default_reps/duration, met_value, image_url, is_active.
- `profiles` — fitness_level, body_weight_kg, weekly_goal, onboarding_completed.
- `workout_sessions` — phase, started/completed, duration, total_reps, rounds_completed, calories_estimate, and a jsonb `exercises` summary (name, body_part, reps, image) used for history and PRs.

## Project structure

```
app/
  _layout.tsx                root stack + auth provider
  welcome.tsx                marketing / entry
  auth.tsx                   sign in / sign up
  forgot-password.tsx        password reset
  onboarding.tsx             3‑step setup
  session.tsx                the circuit timer (haptics + wake‑lock)
  (tabs)/                    Home, Workout, History, Library, Profile
  exercise/[slug].tsx        exercise detail
  components/                Logo, ui, RingTimer, BarChart
  lib/                       supabase, auth, brand, theme, generate, queries, store, types
DB/database.sql              schema + seed
```
