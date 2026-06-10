import {
  rng,
  shuffle,
  allowedPhases,
  selectCircuitExercises,
  estimateCalories,
} from '../app/lib/circuit';
import { Exercise } from '../app/lib/types';

// Minimal Exercise factory for tests.
function ex(partial: Partial<Exercise> & { id: string; movement_pattern: string }): Exercise {
  return {
    id: partial.id,
    name: partial.name ?? `ex-${partial.id}`,
    slug: partial.slug ?? `ex-${partial.id}`,
    description: null,
    instructions: null,
    body_part: partial.body_part ?? 'Core',
    phase: partial.phase ?? 'build',
    movement_pattern: partial.movement_pattern,
    muscle_groups: partial.muscle_groups ?? [],
    equipment: partial.equipment ?? 'none',
    default_reps: partial.default_reps ?? 10,
    default_duration_seconds: partial.default_duration_seconds ?? null,
    met_value: partial.met_value ?? 6,
    image_url: partial.image_url ?? null,
    is_active: true,
  };
}

const onePerPattern: Exercise[] = [
  ex({ id: 'a', movement_pattern: 'squat', name: 'Squat' }),
  ex({ id: 'b', movement_pattern: 'push', name: 'Push-up' }),
  ex({ id: 'c', movement_pattern: 'pull', name: 'Row' }),
  ex({ id: 'd', movement_pattern: 'core', name: 'Plank' }),
  ex({ id: 'e', movement_pattern: 'cardio', name: 'Burpee' }),
];

describe('estimateCalories', () => {
  it('computes MET × weight × hours', () => {
    // 6 MET × 75 kg × (40s / 3600) = 5.0 kcal
    expect(estimateCalories(6, 75, 40)).toBeCloseTo(5.0, 5);
  });

  it('is zero with no work time', () => {
    expect(estimateCalories(6, 75, 0)).toBe(0);
  });
});

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    expect(rng(42)()).toBe(rng(42)());
  });

  it('returns values in [0, 1)', () => {
    const r = rng(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const out = shuffle([1, 2, 3, 4, 5], rng(1));
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('allowedPhases', () => {
  it('foundation draws from itself only', () => {
    expect(allowedPhases('foundation')).toEqual(['foundation']);
  });
  it('build and peak include one phase below', () => {
    expect(allowedPhases('build')).toEqual(['build', 'foundation']);
    expect(allowedPhases('peak')).toEqual(['peak', 'build']);
  });
});

describe('selectCircuitExercises', () => {
  it('produces a 5-exercise, 4-round, 20-minute Build circuit', () => {
    const w = selectCircuitExercises(onePerPattern, 'build', 123);
    expect(w.exercises).toHaveLength(5);
    expect(w.rounds).toBe(4);
    expect(w.perRound).toBe(5);
    expect(w.totalSeconds).toBe(1200);
    expect(w.work).toBe(40);
    expect(w.rest).toBe(20);
  });

  it('covers all five movement patterns when each is available', () => {
    const w = selectCircuitExercises(onePerPattern, 'build', 123);
    const patterns = new Set(w.exercises.map((e) => e.exercise.movement_pattern));
    expect(patterns).toEqual(new Set(['squat', 'push', 'pull', 'core', 'cardio']));
  });

  it('is deterministic for a given seed', () => {
    const ids = (seed: number) =>
      selectCircuitExercises(onePerPattern, 'build', seed).exercises.map((e) => e.exercise.id);
    expect(ids(999)).toEqual(ids(999));
  });

  it('avoids excluded exercises when enough fresh ones remain', () => {
    const pool: Exercise[] = [
      ...onePerPattern,
      ex({ id: 'f', movement_pattern: 'push', name: 'Diamond Push-up' }),
      ex({ id: 'g', movement_pattern: 'core', name: 'Hollow Hold' }),
      ex({ id: 'h', movement_pattern: 'cardio', name: 'High Knees' }),
    ];
    const exclude = ['Squat', 'Push-up', 'Row'];
    const w = selectCircuitExercises(pool, 'build', 5, exclude);
    expect(w.exercises).toHaveLength(5);
    for (const e of w.exercises) {
      expect(exclude).not.toContain(e.exercise.name);
    }
  });

  it('falls back to the full pool when exclusions leave too few', () => {
    const exclude = onePerPattern.slice(0, 4).map((e) => e.name); // exclude 4 of 5
    const w = selectCircuitExercises(onePerPattern, 'build', 5, exclude);
    // Only 1 fresh exercise < perRound(5), so it must reuse the full pool.
    expect(w.exercises).toHaveLength(5);
  });

  it('sets target reps and work duration from the phase', () => {
    const w = selectCircuitExercises(onePerPattern, 'build', 1);
    for (const e of w.exercises) {
      expect(e.target_duration_seconds).toBe(40);
      expect(e.target_reps).toBe(e.exercise.default_reps);
    }
  });
});
