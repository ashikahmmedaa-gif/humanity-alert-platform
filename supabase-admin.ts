import { createClient } from "@supabase/supabase-js";
// Server-only. Never import this module into a Client Component.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase credentials are missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
