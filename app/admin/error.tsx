'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden="true">
        😵
      </p>
      <h1 className="text-lg font-bold text-slate-900">
        管理画面を読み込めませんでした
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        通信状態を確認して、もう一度お試しください。
        <br />
        ログインの有効期限が切れている場合は、ログインし直してください。
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700"
        >
          もう一度読み込む
        </button>
        <Link
          href="/admin/login"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 active:bg-slate-100"
        >
          ログイン画面へ
        </Link>
      </div>
    </div>
  );
}
