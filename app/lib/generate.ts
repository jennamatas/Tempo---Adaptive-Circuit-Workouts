import { supabase } from './supabase';
import { PHASES, PhaseKey } from './brand';
import { Exercise, GeneratedWorkout, WorkoutExercise } from './types';

// Seeded RNG (mulberry32)
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PATTERN_PRIORITY = ['squat', 'hinge', 'push', 'pull', 'core', 'cardio'];

export async function generateWorkout(
  phaseKey: PhaseKey,
  seed = Date.now(),
  excludeNames: string[] = []
): Promise<GeneratedWorkout> {
  const phase = PHASES[phaseKey];

  // Allowed phases: current + one below for variety
  const phaseOrder: PhaseKey[] = ['foundation', 'build', 'peak'];
  const idx = phaseOrder.indexOf(phaseKey);
  const allowed = [phaseKey];
  if (idx > 0) allowed.push(phaseOrder[idx - 1]);

  const { data } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    .in('phase', allowed);

  let pool = (data || []) as Exercise[];
  // Prefer current-phase exercises, fall back to lower
  const fresh = pool.filter((e) => !excludeNames.includes(e.name));
  if (fresh.length >= phase.perRound) pool = fresh;

  const rand = rng(seed);

  const picked: Exercise[] = [];
  const usedIds = new Set<string>();

  // Build pattern-balanced selection: lower (squat/hinge), push, pull, core, cardio
  const slots = [['squat', 'hinge'], ['push'], ['pull'], ['core'], ['cardio']];
  for (const patterns of slots) {
    const candidates = shuffle(
      pool.filter((e) => e.movement_pattern && patterns.includes(e.movement_pattern) && !usedIds.has(e.id)),
      rand
    );
    if (candidates.length) {
      picked.push(candidates[0]);
      usedIds.add(candidates[0].id);
    }
  }

  // Fill remaining slots from rest of pool
  const rest = shuffle(pool.filter((e) => !usedIds.has(e.id)), rand);
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

export function estimateCalories(
  met: number,
  bodyWeightKg: number,
  workSeconds: number
): number {
  return met * bodyWeightKg * (workSeconds / 3600);
}
