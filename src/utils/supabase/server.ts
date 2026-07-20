import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** anon key만 사용 — 이 앱은 service role이 필요 없다(읽기 전용 RPC만 호출). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    },
  );
}
