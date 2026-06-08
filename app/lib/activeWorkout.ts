import { GeneratedWorkout } from './types';

let active: GeneratedWorkout | null = null;

export function setActiveWorkout(w: GeneratedWorkout) {
  active = w;
}

export function getActiveWorkout(): GeneratedWorkout | null {
  return active;
}
