import { signOutAction } from '@/app/actions/auth';

/** ログアウトボタン（Server Action を直接呼ぶ） */
export function SignOutButton({
  variant = 'default',
}: {
  variant?: 'default' | 'primary';
}) {
  const className =
    variant === 'primary'
      ? 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700'
      : 'inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 active:bg-slate-100';

  return (
    <form action={signOutAction}>
      <button type="submit" className={className}>
        ログアウト
      </button>
    </form>
  );
}
