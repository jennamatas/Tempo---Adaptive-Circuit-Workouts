export const brand = {
  name: 'Tempo',
  tagline: 'Train in rhythm.',
  oneLiner: 'Full-body circuits in 20 minutes, built around your level.',
  copy: {
    heroHeadline: '20 minutes. Full body. Done.',
    heroSub: 'Tempo builds a circuit around your level, times every round, and tracks every rep.',
    primaryCta: 'Start free',
    secondaryCta: 'See how it works',
    emptyDashboard: 'No workouts yet. Generate your first circuit and your progress shows up here.',
    postWorkout: 'Logged. You moved today, that counts.',
    streakNudge: (n: number) => `${n} days in a row. Keep the rhythm.`,
  },
};

export const DEVICE_ID = 'tempo-demo';

export const PHASES = {
  foundation: { name: 'Foundation', level: 1, work: 30, rest: 30, perRound: 5, rounds: 4 },
  build: { name: 'Build', level: 2, work: 40, rest: 20, perRound: 5, rounds: 4 },
  peak: { name: 'Peak', level: 3, work: 45, rest: 15, perRound: 5, rounds: 4 },
} as const;

export type PhaseKey = keyof typeof PHASES;

export const levelToPhase: Record<string, PhaseKey> = {
  beginner: 'foundation',
  intermediate: 'build',
  advanced: 'peak',
};
