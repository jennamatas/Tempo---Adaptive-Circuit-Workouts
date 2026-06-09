// Guest mode: local-only profile + session history (no backend, no account).
// Lets a visitor try the full app, and seeds ~8 weeks of demo history on first
// entry so the dashboard, charts, streak, and PRs look alive immediately.
import { getItem, setItem, removeItem } from './store';
import { SessionRow } from './types';
import { supabase } from './supabase';
import { estimateCalories } from './circuit';

export type LocalProfile = {
  full_name: string | null;
  fitness_level: string;
  body_weight_kg: number;
  weekly_goal: number;
  onboarding_completed: boolean;
};

const FLAG = 'tempo:guest';
const PROFILE = 'tempo:guest:profile';
const SESSIONS = 'tempo:guest:sessions';
const SEEDED = 'tempo:guest:seeded';

const DEFAULT_PROFILE: LocalProfile = {
  full_name: 'Guest',
  fitness_level: 'intermediate',
  body_weight_kg: 75,
  weekly_goal: 4,
  onboarding_completed: true,
};

export async function isGuestActive(): Promise<boolean> {
  return (await getItem(FLAG)) === '1';
}

export async function getLocalProfile(): Promise<LocalProfile> {
  const raw = await getItem(PROFILE);
  if (raw) {
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      /* fall through */
    }
  }
  return { ...DEFAULT_PROFILE };
}

export async function saveLocalProfile(patch: Partial<LocalProfile>): Promise<LocalProfile> {
  const next = { ...(await getLocalProfile()), ...patch };
  await setItem(PROFILE, JSON.stringify(next));
  return next;
}

export async function getLocalSessions(): Promise<SessionRow[]> {
  const raw = await getItem(SESSIONS);
  if (raw) {
    try {
      return JSON.parse(raw) as SessionRow[];
    } catch {
      /* fall through */
    }
  }
  return [];
}

export async function addLocalSession(s: SessionRow): Promise<void> {
  const all = await getLocalSessions();
  all.unshift(s);
  await setItem(SESSIONS, JSON.stringify(all));
}

export async function startGuest(): Promise<void> {
  await setItem(FLAG, '1');
  if (!(await getItem(PROFILE))) await setItem(PROFILE, JSON.stringify(DEFAULT_PROFILE));
  if ((await getItem(SEEDED)) !== '1') {
    await seedGuestSessions();
    await setItem(SEEDED, '1');
  }
}

export async function endGuest(): Promise<void> {
  await removeItem(FLAG);
  await removeItem(PROFILE);
  await removeItem(SESSIONS);
  await removeItem(SEEDED);
}

type SeedExercise = {
  name: string;
  body_part: string;
  image_url: string | null;
  met_value: number;
  default_reps: number | null;
};

// ~28 completed Build sessions across the last 8 weeks, reps trending upward.
async function seedGuestSessions(): Promise<void> {
  let pool: SeedExercise[] = [];
  try {
    const { data } = await supabase
      .from('exercises')
      .select('name, body_part, image_url, met_value, default_reps')
      .eq('is_active', true)
      .limit(40);
    pool = (data as SeedExercise[]) || [];
  } catch {
    /* offline — use fallback below */
  }
  if (!pool.length) {
    pool = [
      { name: 'Push-up', body_part: 'Chest', image_url: null, met_value: 8, default_reps: 12 },
      { name: 'Bodyweight Squat', body_part: 'Legs', image_url: null, met_value: 7, default_reps: 15 },
      { name: 'Inverted Row', body_part: 'Back', image_url: null, met_value: 7, default_reps: 10 },
      { name: 'Plank', body_part: 'Core', image_url: null, met_value: 4, default_reps: 12 },
      { name: 'High Knees', body_part: 'Cardio', image_url: null, met_value: 9, default_reps: 20 },
    ];
  }

  const sessions: SessionRow[] = [];
  const now = Date.now();
  const DAY = 86_400_000;
  const WORK = 40;
  const ROUNDS = 4;

  for (let w = 7; w >= 0; w--) {
    const perWeek = 3 + (w % 2); // 3 or 4 sessions/week
    for (let i = 0; i < perWeek; i++) {
      const daysAgo = w * 7 + (i * 2 + 1);
      const started = new Date(now - daysAgo * DAY);
      started.setHours(7 + i, 0, 0, 0);

      const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
      const trend = (7 - w) / 7; // 0 (oldest) → 1 (most recent)
      const exercises = picks.map((p) => {
        const base = p.default_reps ?? 12;
        const reps = Math.max(4, Math.round((base * 0.7 + base * 0.5 * trend) * ROUNDS));
        return { name: p.name, body_part: p.body_part, reps, image_url: p.image_url };
      });
      const totalReps = exercises.reduce((a, b) => a + b.reps, 0);
      const calories = picks.reduce(
        (a, p) => a + estimateCalories(p.met_value || 6, 75, WORK) * ROUNDS,
        0
      );

      sessions.push({
        id: `guest-${daysAgo}-${i}`,
        device_id: 'guest',
        phase: 'build',
        started_at: started.toISOString(),
        completed_at: started.toISOString(),
        duration_seconds: 1200,
        total_reps: totalReps,
        rounds_completed: ROUNDS,
        calories_estimate: Math.round(calories),
        status: 'completed',
        exercises,
      });
    }
  }

  await setItem(SESSIONS, JSON.stringify(sessions));
}
