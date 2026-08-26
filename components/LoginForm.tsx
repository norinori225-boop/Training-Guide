'use client';

import { useActionState } from 'react';
import { signInAction, type LoginState } from '@/app/actions/auth';

// 'use server' のファイルは async 関数しか export できないので、
// 初期状態はこちら側で持つ。
const LOGIN_INITIAL_STATE: LoginState = { ok: true, message: '' };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    signInAction,
    LOGIN_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!state.ok && state.message && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700 disabled:opacity-60"
      >
        {isPending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  );
}
