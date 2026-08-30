import { cache } from 'react';
import type { JwtPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * 管理者判定は Supabase Auth の app_metadata.role === 'admin' だけで決める。
 *
 * ⚠️ user_metadata は本人が更新できてしまうため、権限判定には絶対に使わないこと。
 * DB 側の RLS（public.is_admin()）も同じ app_metadata.role を見ている。
 */
const ADMIN_ROLE = 'admin';

/** 画面に出すぶんだけのログイン情報 */
export type SessionUser = {
  id: string;
  email: string | null;
};

/**
 * ログイン中のアクセストークン（JWT）を検証して中身を返す。未ログインなら null。
 *
 * ■ なぜ getUser() ではなく getClaims() なのか
 * どちらも「Cookie を書き換えただけでは突破できない」という条件を満たすが、
 * 確かめ方が違う。
 *   - getUser()   … 毎回 Supabase の認証サーバーへ問い合わせて検証する（通信1往復）
 *   - getClaims() … 署名を手元で検証する。このプロジェクトの JWT は ES256（非対称鍵）で
 *                   署名されているので、公開鍵さえあれば通信なしで確かめられる。
 *                   公開鍵（JWKS）はプロセス内に10分キャッシュされる。
 * 管理画面は1画面ぶんの表示でこれを何度も通るため、往復のぶんがそのまま
 * 画面切り替えのラグになっていた。
 * ⚠️ getSession() は署名を検証しないので、権限判定には絶対に使わないこと。
 *
 * ■ 代わりに受け入れたこと
 * 認証サーバーに毎回聞かなくなるので、権限をはく奪しても手元のトークンが
 * 期限切れになるまでは管理者のままになる。ただし DB 側の RLS も同じ JWT の
 * app_metadata.role を見ているので（migrations の public.is_admin()）、
 * 判定の材料はもともと同じ。管理者が実質1人のこのアプリでは割に合う。
 *
 * ■ cache() で包む理由
 * 1リクエストの中で AdminGuard と各ページが別々に呼ぶため。包まないと
 * 同じ検証を2回やることになる（以前はこれが2往復ぶんの通信になっていた）。
 *
 * なお、対称鍵（HS256）の署名や WebCrypto が使えない環境では、supabase-js が
 * 自動的に getUser() と同じ問い合わせに切り替える。安全側に倒れるので、
 * 鍵の設定を変えてもこのコードのままで動く。
 */
const getClaims = cache(async (): Promise<JwtPayload | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

function isAdmin(claims: JwtPayload | null): boolean {
  return claims?.app_metadata?.role === ADMIN_ROLE;
}

function toSessionUser(claims: JwtPayload): SessionUser {
  return { id: claims.sub, email: claims.email ?? null };
}

/** ログイン中のユーザーを返す（未ログインなら null） */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const claims = await getClaims();
  return claims ? toSessionUser(claims) : null;
}

/** 画面の出し分け用。ログイン状態と管理者かどうかをまとめて返す */
export async function getAdminState(): Promise<
  | { status: 'anonymous'; user: null }
  | { status: 'forbidden'; user: SessionUser }
  | { status: 'admin'; user: SessionUser }
> {
  const claims = await getClaims();

  if (!claims) return { status: 'anonymous', user: null };

  const user = toSessionUser(claims);
  if (!isAdmin(claims)) return { status: 'forbidden', user };
  return { status: 'admin', user };
}

/**
 * 管理者でなければ例外を投げる。
 * 管理系の Server Action は必ず最初にこれを通すこと（RLS と合わせて二重の防御）。
 */
export async function requireAdmin(): Promise<void> {
  const claims = await getClaims();

  if (!claims) {
    throw new Error('ログインが必要です。');
  }
  if (!isAdmin(claims)) {
    throw new Error('このアカウントには管理権限がありません。');
  }
}
