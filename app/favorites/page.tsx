import type { Metadata } from 'next';
import Link from 'next/link';
import { FavoritesList } from '@/components/FavoritesList';
import { fetchTrainings } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'お気に入り',
  description: 'あとでやりたい種目をまとめて見られます。',
};

// 管理画面での変更をすぐ反映したいので、常に動的レンダリングにする。
export const dynamic = 'force-dynamic';

/**
 * お気に入り。
 *
 * どれがお気に入りかは端末内（localStorage）にしかないので、
 * サーバーでは全ジャンルの種目をまとめて取り、絞り込みはクライアントで行う。
 * 「お気に入りの id で1件ずつ問い合わせる」形にすると、端末ごとに違う
 * クエリが飛んでキャッシュも効かないため、この分担にしている。
 */
export default async function FavoritesPage() {
  const trainings = await fetchTrainings();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-medium text-sky-700 active:text-sky-900"
        >
          <span aria-hidden="true">←</span> ホーム
        </Link>

        <h1 className="text-xl font-bold text-slate-900">お気に入り</h1>
      </header>

      <FavoritesList trainings={trainings} />

      <footer className="mt-2 border-t border-slate-200 pt-4">
        <p className="text-xs leading-relaxed text-slate-500">
          お気に入りはこの端末のブラウザに保存されます。別の端末やブラウザには引き継がれません。閲覧履歴を消すと消えることがあります。
        </p>
      </footer>
    </div>
  );
}
