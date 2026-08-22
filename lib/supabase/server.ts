import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * サーバー（Server Component / Server Action / Route Handler）用の Supabase クライアント。
 *
 * ⚠️ 重要: ここで使うのは anon キーのみ。
 * リクエスト処理では service_role キーを絶対に使わない（RLS をすり抜けてしまうため）。
 * service_role キーはローカルのシードスクリプト専用。
 *
 * 読み書きはログインユーザーのセッション（Cookie）経由で行い、必ず RLS を通す。
 */
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component からは Cookie を書けない。
            // セッションの更新は middleware.ts が担当するため、ここでは無視してよい。
          }
        },
      },
    },
  );
}
