import { createClient } from "@supabase/supabase-js";

// Values come from your Supabase project (Project Settings > API Keys).
// Copy .env.example to .env.local and fill these in — never commit real values.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
