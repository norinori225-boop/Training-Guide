import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const LOGIN_PATH = '/admin/login';

export async function middleware(request: NextRequest) {
  // セッション（アクセストークン）を更新する
  const { response, isLoggedIn } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const needsAuth = pathname.startsWith('/admin') && pathname !== LOGIN_PATH;

  if (needsAuth && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';

    // 更新済みの Cookie をリダイレクト先にも引き継ぐ
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  /*
   * 認証を使うのは /admin 配下だけなので、そこに限定する。
   * 利用者向けページ（/ と /training/*）は未ログインで見られる仕様なので、
   * 毎リクエストで Supabase に問い合わせる必要がない。
   */
  matcher: ['/admin/:path*'],
};
