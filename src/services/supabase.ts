import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ffpcvpsyzuctzqpwtnez.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcGN2cHN5enVjdHpxcHd0bmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTg0MjQsImV4cCI6MjEwNDM5NDQyNH0.Bx9eAZGaUqnW0FfHGG1_r--VVbDy70TbeONYmz4YjK8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
