import { supabase } from './supabase';
import { SessionRow } from './types';

export async function fetchSessions(userId: string | null, limit = 100): Promise<SessionRow[]> {
  if (!userId) return [];
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(limit);
  return (data || []) as SessionRow[];
}


export type DashboardStats = {
  totalWorkouts: number;
  totalReps: number;
  totalMinutes: number;
  streak: number;
  thisWeek: number;
  weekly: { label: string; workouts: number; reps: number }[];
  bodyPartBalance: Record<string, number>;
};

export type PersonalRecord = {
  name: string;
  bodyPart: string;
  reps: number;
  imageUrl: string | null;
  achievedAt: string;
};

// Best reps logged for each exercise across all completed sessions.
export function computePersonalRecords(sessions: SessionRow[], limit = 5): PersonalRecord[] {
  const best: Record<string, PersonalRecord> = {};
  for (const s of sessions) {
    for (const e of s.exercises || []) {
      const reps = e.reps ?? 0;
      if (reps <= 0) continue;
      const current = best[e.name];
      if (!current || reps > current.reps) {
        best[e.name] = {
          name: e.name,
          bodyPart: e.body_part,
          reps,
          imageUrl: e.image_url,
          achievedAt: s.started_at,
        };
      }
    }
  }
  return Object.values(best)
    .sort((a, b) => b.reps - a.reps)
    .slice(0, limit);
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday start
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export function computeStats(sessions: SessionRow[]): DashboardStats {
  const totalWorkouts = sessions.length;
  const totalReps = sessions.reduce((s, x) => s + (x.total_reps || 0), 0);
  const totalMinutes = Math.round(sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60);

  // streak: consecutive days with a workout ending today/yesterday
  const days = new Set(
    sessions.map((s) => {
      const d = new Date(s.started_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // allow streak to start today or yesterday
  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sow = startOfWeek(new Date()).getTime();
  const thisWeek = sessions.filter((s) => new Date(s.started_at).getTime() >= sow).length;

  // weekly buckets last 8 weeks
  const weekly: { label: string; workouts: number; reps: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = startOfWeek(new Date());
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const inWeek = sessions.filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= ws.getTime() && t < we.getTime();
    });
    weekly.push({
      label: `${ws.getMonth() + 1}/${ws.getDate()}`,
      workouts: inWeek.length,
      reps: inWeek.reduce((a, b) => a + (b.total_reps || 0), 0),
    });
  }

  const bodyPartBalance: Record<string, number> = {};
  sessions.forEach((s) => {
    (s.exercises || []).forEach((e) => {
      bodyPartBalance[e.body_part] = (bodyPartBalance[e.body_part] || 0) + 1;
    });
  });

  return { totalWorkouts, totalReps, totalMinutes, streak, thisWeek, weekly, bodyPartBalance };
}
