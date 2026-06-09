import { supabase } from './supabase';
import { SessionRow } from './types';
import { getLocalSessions } from './local';

// Pure aggregation lives in stats.ts; re-exported here so existing imports
// (`import { computeStats, computePersonalRecords, DashboardStats } from './queries'`)
// keep working.
export * from './stats';

// Guests read their locally-stored history; signed-in users read the backend.
export async function fetchSessions(
  userId: string | null,
  opts: { guest?: boolean; limit?: number } = {}
): Promise<SessionRow[]> {
  const limit = opts.limit ?? 100;
  if (opts.guest) return (await getLocalSessions()).slice(0, limit);
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
