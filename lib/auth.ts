import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * 管理者判定は Supabase Auth の app_metadata.role === 'admin' だけで決める。
 *
 * ⚠️ user_metadata は本人が更新できてしまうため、権限判定には絶対に使わないこと。
 * DB 側の RLS（public.is_admin()）も同じ app_metadata.role を見ている。
 */
const ADMIN_ROLE = 'admin';

function isAdmin(user: User | null): boolean {
  return user?.app_metadata?.role === ADMIN_ROLE;
}

/**
 * ログイン中のユーザーを返す（未ログインなら null）。
 *
 * getSession() ではなく getUser() を使う。getUser() は Supabase 側で
 * トークンを検証するため、Cookie を書き換えただけでは突破できない。
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** 画面の出し分け用。ログイン状態と管理者かどうかをまとめて返す */
export async function getAdminState(): Promise<
  | { status: 'anonymous'; user: null }
  | { status: 'forbidden'; user: User }
  | { status: 'admin'; user: User }
> {
  const user = await getCurrentUser();

  if (!user) return { status: 'anonymous', user: null };
  if (!isAdmin(user)) return { status: 'forbidden', user };
  return { status: 'admin', user };
}

/**
 * 管理者でなければ例外を投げる。
 * 管理系の Server Action は必ず最初にこれを通すこと（RLS と合わせて二重の防御）。
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('ログインが必要です。');
  }
  if (!isAdmin(user)) {
    throw new Error('このアカウントには管理権限がありません。');
  }

  return user;
}
