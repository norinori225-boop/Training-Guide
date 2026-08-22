import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminState } from '@/lib/auth';
import { SignOutButton } from '@/components/SignOutButton';

/**
 * 管理画面の共通ガード。すべての /admin 配下のページはこれで包む。
 *
 * - 未ログイン        → /admin/login へリダイレクト（middleware と二重の防御）
 * - ログイン済みだが非管理者 → 権限なし表示 ＋ ログアウトボタン
 * - 管理者            → children を表示
 *
 * children は管理者のときにしか描画されないので、この中でのデータ取得は
 * 権限が無いユーザーには実行されない。書き込み系の Server Action 側でも
 * 別途 requireAdmin() を通すこと。
 */
export async function AdminGuard({ children }: { children: React.ReactNode }) {
  const state = await getAdminState();

  if (state.status === 'anonymous') {
    redirect('/admin/login');
  }

  if (state.status === 'forbidden') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-4xl" aria-hidden="true">
          🔒
        </p>
        <h1 className="text-lg font-bold text-slate-900">
          このアカウントには管理権限がありません
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          {state.user.email} でログインしています。
          <br />
          別のアカウントでログインし直してください。
        </p>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <SignOutButton variant="primary" />
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 active:bg-slate-100"
          >
            一覧にもどる
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
