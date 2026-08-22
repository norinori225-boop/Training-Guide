import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden="true">
        🔎
      </p>
      <h1 className="text-lg font-bold text-slate-900">
        ページが見つかりませんでした
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        削除されたか、URL が間違っている可能性があります。
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700"
      >
        一覧にもどる
      </Link>
    </div>
  );
}
