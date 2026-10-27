import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing Supabase keys. Check .env.local and restart npm run dev.",
  );
}

// One shared connection to Supabase for the whole app.
export const supabase = createClient(url, key);
