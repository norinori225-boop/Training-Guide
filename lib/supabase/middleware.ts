import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * middleware 用の Supabase クライアント。
 * アクセストークンを更新し、更新後の Cookie をレスポンスに載せて返す。
 *
 * ここでも使うのは anon キーのみ。service_role キーは使わない。
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
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

  // getSession() ではなく getUser() を使うこと。
  // getUser() は Supabase 側でトークンを検証するため、改ざんされた Cookie を弾ける。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
