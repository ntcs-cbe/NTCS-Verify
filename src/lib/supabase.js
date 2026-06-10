import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Security: avoid persisting auth tokens in localStorage by default.
// This reduces exposure to XSS attacks. If you need session persistence,
// enable it explicitly in a secure server-side flow or set
// `VITE_SUPABASE_PERSIST_SESSION=true` in a controlled environment.
const persistSession = import.meta.env.VITE_SUPABASE_PERSIST_SESSION === 'true';

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		persistSession: persistSession,
		detectSessionInUrl: false,
	},
});