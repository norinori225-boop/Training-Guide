import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminState } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';
import { SignOutButton } from '@/components/SignOutButton';

export const metadata: Metadata = { title: '管理者ログイン' };

export default async function AdminLoginPage() {
  const state = await getAdminState();

  // すでに管理者としてログイン済みなら管理画面へ
  if (state.status === 'admin') {
    redirect('/admin');
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-xl font-bold text-slate-900">管理者ログイン</h1>
        <p className="mt-1 text-sm text-slate-600">
          トレーニングの追加・編集をするにはログインしてください。
        </p>
      </header>

      {state.status === 'forbidden' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            {state.user.email} でログイン中ですが、このアカウントには管理権限がありません。
            ログアウトしてから別のアカウントでログインしてください。
          </p>
          <SignOutButton />
        </div>
      ) : (
        <LoginForm />
      )}

      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-sky-700 active:text-sky-900"
      >
        ← ホームにもどる
      </Link>
    </div>
  );
}
