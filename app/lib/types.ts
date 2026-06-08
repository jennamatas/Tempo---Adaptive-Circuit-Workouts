export type Exercise = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  body_part: string;
  phase: string;
  movement_pattern: string | null;
  muscle_groups: string[];
  equipment: string;
  default_reps: number | null;
  default_duration_seconds: number | null;
  met_value: number;
  image_url: string | null;
  is_active: boolean;
};

export type WorkoutExercise = {
  exercise: Exercise;
  target_reps: number | null;
  target_duration_seconds: number;
};

export type GeneratedWorkout = {
  phase: string;
  work: number;
  rest: number;
  rounds: number;
  perRound: number;
  totalSeconds: number;
  exercises: WorkoutExercise[];
};

export type SessionRow = {
  id: string;
  device_id: string;
  phase: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_reps: number;
  rounds_completed: number;
  calories_estimate: number | null;
  status: string;
  exercises: { name: string; body_part: string; reps: number | null; image_url: string | null }[];
};
