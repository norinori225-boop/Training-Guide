'use client';

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
        画面を読み込めませんでした
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        通信状態を確認して、もう一度お試しください。
        <br />
        何度も失敗する場合は、しばらく時間をおいてからアクセスしてください。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700"
      >
        もう一度読み込む
      </button>
    </div>
  );
}
