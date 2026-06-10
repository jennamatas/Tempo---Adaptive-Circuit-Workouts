import { createClient } from '@supabase/supabase-js';

// Initialize database client.
// Prefer environment variables (EXPO_PUBLIC_*) so the backend can be swapped
// without code changes; fall back to the bundled demo project so a fresh
// clone runs immediately.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://phmgpbnpxorlwpguefmk.databasepad.com';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjcwNGY5MDZkLTljMDEtNGIzNy1hNDUwLTE0YjY5MjdmNzU1ZCJ9.eyJwcm9qZWN0SWQiOiJwaG1ncGJucHhvcmx3cGd1ZWZtayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgwOTQ2Mjg2LCJleHAiOjIwOTYzMDYyODYsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.12oQXnN84pRDfD1GQFqPV9gF1eg2J0DejeRamyYB2bA';


// Provide a no-op WebSocket during Node build (realtime is unused here)
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class {
    close() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
  };
}

// Use AsyncStorage for session persistence when available
// Choose an appropriate storage adapter depending on runtime.
// - On Node (SSR) don't provide storage so supabase doesn't attempt persistence.
// - In browser use localStorage.
// - Otherwise (native) attempt to require AsyncStorage.
let storage: any = undefined;
if (typeof window === 'undefined') {
  // Server-side: leave undefined to avoid calling browser APIs
  storage = undefined;
} else if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  storage = {
    getItem: async (key: string) => Promise.resolve(window.localStorage.getItem(key)),
    setItem: async (key: string, value: string) => Promise.resolve(window.localStorage.setItem(key, value)),
    removeItem: async (key: string) => Promise.resolve(window.localStorage.removeItem(key)),
  };
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    storage = undefined;
  }
}

const supabase = createClient(supabaseUrl, supabaseKey, {

  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { supabase };
