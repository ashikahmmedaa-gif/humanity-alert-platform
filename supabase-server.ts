import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function supabaseServer() {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, key, {
    cookies: { getAll: () => jar.getAll(), setAll: (items) => {
      try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {}
    }}
  });
}
