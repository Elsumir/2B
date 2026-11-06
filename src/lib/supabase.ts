import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Не заданы переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
