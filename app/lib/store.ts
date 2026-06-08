import { useEffect, useState } from 'react';

let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

const memory: Record<string, string> = {};

async function getItem(key: string): Promise<string | null> {
  if (AsyncStorage) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memory[key] ?? null;
    }
  }
  return memory[key] ?? null;
}

async function setItem(key: string, value: string): Promise<void> {
  memory[key] = value;
  if (AsyncStorage) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* noop */
    }
  }
}

export type Level = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_KEY = 'tempo:level';
const WEIGHT_KEY = 'tempo:weight';

export function useLevel(): [Level, (l: Level) => void, boolean] {
  const [level, setLevelState] = useState<Level>('intermediate');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getItem(LEVEL_KEY).then((v) => {
      if (v === 'beginner' || v === 'intermediate' || v === 'advanced') setLevelState(v);
      setLoaded(true);
    });
  }, []);

  const setLevel = (l: Level) => {
    setLevelState(l);
    setItem(LEVEL_KEY, l);
  };

  return [level, setLevel, loaded];
}

export async function getBodyWeight(): Promise<number> {
  const v = await getItem(WEIGHT_KEY);
  const n = v ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 75;
}

export async function setBodyWeight(kg: number): Promise<void> {
  await setItem(WEIGHT_KEY, String(kg));
}
