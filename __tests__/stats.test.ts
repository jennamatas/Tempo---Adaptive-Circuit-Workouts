import { computeStats, computePersonalRecords } from '../app/lib/stats';
import { SessionRow } from '../app/lib/types';

type Ex = { name: string; body_part: string; reps: number | null; image_url: string | null };

function session(partial: Partial<SessionRow> & { started_at: string; exercises: Ex[] }): SessionRow {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    device_id: partial.device_id ?? 'test',
    phase: partial.phase ?? 'build',
    started_at: partial.started_at,
    completed_at: partial.completed_at ?? partial.started_at,
    duration_seconds: partial.duration_seconds ?? 1200,
    total_reps: partial.total_reps ?? 0,
    rounds_completed: partial.rounds_completed ?? 4,
    calories_estimate: partial.calories_estimate ?? 100,
    status: partial.status ?? 'completed',
    exercises: partial.exercises,
  };
}

describe('computePersonalRecords', () => {
  it('keeps the best reps per exercise, sorted descending', () => {
    const sessions: SessionRow[] = [
      session({
        started_at: '2026-01-01T10:00:00Z',
        exercises: [{ name: 'Push-up', body_part: 'Chest', reps: 20, image_url: null }],
      }),
      session({
        started_at: '2026-02-01T10:00:00Z',
        exercises: [
          { name: 'Push-up', body_part: 'Chest', reps: 30, image_url: null },
          { name: 'Squat', body_part: 'Legs', reps: 40, image_url: null },
        ],
      }),
    ];
    const prs = computePersonalRecords(sessions);
    expect(prs.map((p) => [p.name, p.reps])).toEqual([
      ['Squat', 40],
      ['Push-up', 30],
    ]);
    expect(prs[1].achievedAt).toBe('2026-02-01T10:00:00Z'); // date of the best, not first
  });

  it('ignores zero/empty rep entries and respects the limit', () => {
    const sessions: SessionRow[] = [
      session({
        started_at: '2026-01-01T10:00:00Z',
        exercises: [
          { name: 'Plank', body_part: 'Core', reps: 0, image_url: null },
          { name: 'A', body_part: 'Core', reps: 5, image_url: null },
          { name: 'B', body_part: 'Core', reps: 6, image_url: null },
          { name: 'C', body_part: 'Core', reps: 7, image_url: null },
        ],
      }),
    ];
    expect(computePersonalRecords(sessions).find((p) => p.name === 'Plank')).toBeUndefined();
    expect(computePersonalRecords(sessions, 2)).toHaveLength(2);
  });

  it('returns nothing for no sessions', () => {
    expect(computePersonalRecords([])).toEqual([]);
  });
});

describe('computeStats', () => {
  it('aggregates totals and body-part balance', () => {
    const now = new Date().toISOString();
    const sessions: SessionRow[] = [
      session({
        started_at: now,
        total_reps: 50,
        duration_seconds: 1200,
        exercises: [
          { name: 'Plank', body_part: 'Core', reps: 30, image_url: null },
          { name: 'Squat', body_part: 'Legs', reps: 20, image_url: null },
        ],
      }),
    ];
    const stats = computeStats(sessions);
    expect(stats.totalWorkouts).toBe(1);
    expect(stats.totalReps).toBe(50);
    expect(stats.totalMinutes).toBe(20); // 1200s / 60
    expect(stats.bodyPartBalance).toEqual({ Core: 1, Legs: 1 });
    expect(stats.weekly).toHaveLength(8);
  });

  it('counts a workout today toward this week and a 1-day streak', () => {
    const now = new Date().toISOString();
    const stats = computeStats([
      session({ started_at: now, exercises: [{ name: 'X', body_part: 'Core', reps: 1, image_url: null }] }),
    ]);
    expect(stats.thisWeek).toBe(1);
    expect(stats.streak).toBe(1);
  });

  it('is empty for no sessions', () => {
    const stats = computeStats([]);
    expect(stats.totalWorkouts).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.weekly).toHaveLength(8);
  });
});
