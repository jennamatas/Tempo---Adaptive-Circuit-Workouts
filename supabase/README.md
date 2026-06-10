# Supabase — schema, seed & sync

Migrate the Tempo schema to a real Supabase project and point the app/Vercel at it.

```
supabase/
  migrations/0001_init.sql   # tables, indexes, RLS, profile-on-signup trigger
  seed.sql                   # 32-exercise reference library (service role / db reset)
```

Target project (from `.env.seed.local`): **`taukayjtsvlbmmpunrxq`** → `https://taukayjtsvlbmmpunrxq.supabase.co`

## 1. Apply schema + seed

Pick one:

**A. Supabase Dashboard (no tooling)** — SQL Editor → paste & run `migrations/0001_init.sql`, then paste & run `seed.sql`.

**B. Supabase CLI**
```bash
supabase link --project-ref taukayjtsvlbmmpunrxq
supabase db push          # applies migrations/
psql "$POSTGRES_URL_NON_POOLING" -f supabase/seed.sql   # load exercises (service connection)
```

**C. psql directly** (service connection string is in `.env.seed.local`)
```bash
set -a; source .env.seed.local; set +a
psql "$POSTGRES_URL_NON_POOLING" -f supabase/migrations/0001_init.sql
psql "$POSTGRES_URL_NON_POOLING" -f supabase/seed.sql
```

> Also enable **Email** auth in Authentication → Providers (and, for a frictionless MVP, disable "Confirm email" so signups land logged-in).

## 2. Repoint the app + Vercel env

Update the two public client vars to the real project (anon key is in `.env.seed.local` as `SUPABASE_ANON_KEY`):

```bash
# local
#   .env.local:
#   EXPO_PUBLIC_SUPABASE_URL=https://taukayjtsvlbmmpunrxq.supabase.co
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY from .env.seed.local>

# Vercel (token in .env.deploy.local)
set -a; source .env.deploy.local; source .env.seed.local; set +a
printf '%s' "https://taukayjtsvlbmmpunrxq.supabase.co" | vercel env add EXPO_PUBLIC_SUPABASE_URL production --token "$VERCEL_TOKEN" --force
printf '%s' "$SUPABASE_ANON_KEY" | vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production --token "$VERCEL_TOKEN" --force
```

## 3. Redeploy

```bash
set -a; source .env.deploy.local; set +a
vercel deploy --prod --token "$VERCEL_TOKEN"
```

A fresh project starts with the exercise library seeded but **no users/sessions** — sign-ups create their own profile (via the trigger); guest mode keeps working locally.
