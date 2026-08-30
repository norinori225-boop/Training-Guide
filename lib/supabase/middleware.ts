import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * middleware 用の Supabase クライアント。
 * アクセストークンを更新し、更新後の Cookie をレスポンスに載せて返す。
 *
 * ここでも使うのは anon キーのみ。service_role キーは使わない。
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  isLoggedIn: boolean;
}> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getSession() ではなく getClaims() を使うこと。
  // getClaims() は JWT の署名を検証するので、改ざんされた Cookie を弾ける。
  // このプロジェクトの JWT は ES256（非対称鍵）なので、検証は手元で完結し
  // Supabase への往復が要らない。理由と代償は lib/auth.ts の説明を参照。
  //
  // 期限が近いトークンは getClaims() の中で先に更新されるので、
  // ここが「セッションを延ばす」役目を持っている点は今までと変わらない
  // （更新後の Cookie は上の setAll がレスポンスに載せる）。
  const { data } = await supabase.auth.getClaims();

  return { response, isLoggedIn: Boolean(data?.claims) };
}
