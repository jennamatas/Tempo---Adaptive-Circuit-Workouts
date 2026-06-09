// Pure circuit-generation logic — no network, no Supabase, no React.
// Kept dependency-free so it can be unit-tested in isolation (see
// app/__tests__/circuit.test.ts). The data-fetching wrapper lives in generate.ts.
import { PHASES, PhaseKey } from './brand';
import { Exercise, GeneratedWorkout, WorkoutExercise } from './types';

// Seeded RNG (mulberry32) — deterministic so a given seed reproduces a circuit.
export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The phases a circuit may draw from: the target phase plus one below for variety.
export function allowedPhases(phaseKey: PhaseKey): PhaseKey[] {
  const phaseOrder: PhaseKey[] = ['foundation', 'build', 'peak'];
  const idx = phaseOrder.indexOf(phaseKey);
  const allowed: PhaseKey[] = [phaseKey];
  if (idx > 0) allowed.push(phaseOrder[idx - 1]);
  return allowed;
}

// Pattern-balanced selection of `phase.perRound` exercises from a candidate pool:
// one lower-body (squat/hinge), one push, one pull, one core, one cardio, then
// fill any empty slots from the remaining pool. Seeded for reproducible variety.
export function selectCircuitExercises(
  pool: Exercise[],
  phaseKey: PhaseKey,
  seed = Date.now(),
  excludeNames: string[] = []
): GeneratedWorkout {
  const phase = PHASES[phaseKey];

  // Prefer exercises not used in recent sessions; fall back if that's too few.
  const fresh = pool.filter((e) => !excludeNames.includes(e.name));
  const candidates = fresh.length >= phase.perRound ? fresh : pool;

  const rand = rng(seed);
  const picked: Exercise[] = [];
  const usedIds = new Set<string>();

  const slots = [['squat', 'hinge'], ['push'], ['pull'], ['core'], ['cardio']];
  for (const patterns of slots) {
    const matches = shuffle(
      candidates.filter(
        (e) => e.movement_pattern && patterns.includes(e.movement_pattern) && !usedIds.has(e.id)
      ),
      rand
    );
    if (matches.length) {
      picked.push(matches[0]);
      usedIds.add(matches[0].id);
    }
  }

  // Fill any remaining slots from the rest of the pool.
  const rest = shuffle(candidates.filter((e) => !usedIds.has(e.id)), rand);
  for (const e of rest) {
    if (picked.length >= phase.perRound) break;
    picked.push(e);
    usedIds.add(e.id);
  }

  const exercises: WorkoutExercise[] = picked.slice(0, phase.perRound).map((e) => ({
    exercise: e,
    target_reps: e.default_reps,
    target_duration_seconds: phase.work,
  }));

  return {
    phase: phaseKey,
    work: phase.work,
    rest: phase.rest,
    rounds: phase.rounds,
    perRound: phase.perRound,
    totalSeconds: (phase.work + phase.rest) * phase.perRound * phase.rounds,
    exercises,
  };
}

// kcal for one station = MET × body-weight(kg) × hours. Falls back to 70 kg upstream.
export function estimateCalories(met: number, bodyWeightKg: number, workSeconds: number): number {
  return met * bodyWeightKg * (workSeconds / 3600);
}
