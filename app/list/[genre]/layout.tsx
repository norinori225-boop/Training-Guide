import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GENRE_LABELS, isGenreCode } from '@/lib/constants';

/**
 * ジャンルの検証と、データに依存しないヘッダーを受け持つ。
 *
 * ここが layout なのは、ページ本体を包む loading.tsx の外側で動かすため。
 * 検証を page.tsx に置くと、先にスケルトンと 200 のヘッダーが流れてしまい、
 * 画面は404でも HTTP ステータスが 200 のままになる（レスポンス送信済みのため
 * 後から変えられない）。layout なら送信前に弾けるので 404 を返せる。
 *
 * ついでに見出しと「← ホーム」が即座に出るようになり、一覧の読み込み中でも
 * 自分がどこにいるか・どう戻るかが分かる。
 */
export default async function GenreListLayout({
  params,
  children,
}: LayoutProps<'/list/[genre]'>) {
  const { genre } = await params;

  // 'body-play' / 'lifting' 以外の URL は 404
  if (!isGenreCode(genre)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-medium text-sky-700 active:text-sky-900"
        >
          <span aria-hidden="true">←</span> ホーム
        </Link>

        <h1 className="text-xl font-bold text-slate-900">
          {GENRE_LABELS[genre]}
        </h1>
      </header>

      {children}
    </div>
  );
}
