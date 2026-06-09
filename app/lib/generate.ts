import { supabase } from './supabase';
import { PhaseKey } from './brand';
import { Exercise, GeneratedWorkout } from './types';
import { selectCircuitExercises, allowedPhases } from './circuit';

// Re-exported so existing imports (`import { estimateCalories } from './generate'`)
// keep working while the pure logic lives in circuit.ts.
export { estimateCalories } from './circuit';

// Fetches the active exercise pool for the phase, then runs the pure selection.
export async function generateWorkout(
  phaseKey: PhaseKey,
  seed = Date.now(),
  excludeNames: string[] = []
): Promise<GeneratedWorkout> {
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    .in('phase', allowedPhases(phaseKey));

  const pool = (data || []) as Exercise[];
  return selectCircuitExercises(pool, phaseKey, seed, excludeNames);
}
