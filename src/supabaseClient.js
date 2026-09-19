import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://lfvfwdmalamtnlrfsenf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s5FcnkCxXOqUMRCa8h-YlQ_fSnm2T1C';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
