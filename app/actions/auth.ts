'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = {
  ok: boolean;
  message: string;
};

/**
 * メール＋パスワードでログインする。
 *
 * サインアップ画面は作らない（管理者は Supabase ダッシュボードで手動作成する方針）。
 * 認証の失敗理由は「メールが存在しない」か「パスワードが違う」かを区別せず、
 * 総当たりの手がかりを与えないよう同じ文言を返す。
 */
export async function signInAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, message: 'メールアドレスとパスワードを入力してください。' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      message: 'メールアドレスまたはパスワードが正しくありません。',
    };
  }

  // redirect() は内部で例外を投げるので try/catch の外で呼ぶ
  redirect('/admin');
}

/** ログアウトしてログイン画面へ戻す */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
