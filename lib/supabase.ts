import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.REACT_APP_SUPABASE_URL ??
  'https://gkhtlzfpmkfschtqrqcl.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.REACT_APP_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraHRsemZwbWtmc2NodHFycWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjk4OTYsImV4cCI6MjA5MTkwNTg5Nn0.cwdCJaQPujaLhblH1enkHO8HS1K6Fw66PP3dFIeewbI';

const isWeb = Platform.OS === 'web';
const isServer = isWeb && typeof window === 'undefined';

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

const authStorage = isServer ? undefined : isWeb ? webStorage : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage as any,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: isWeb,
  },
});
