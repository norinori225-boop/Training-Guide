import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CategoryChips } from '@/components/CategoryChips';
import { SafetyNotice } from '@/components/SafetyNotice';
import { SearchBox } from '@/components/SearchBox';
import { TrainingCard } from '@/components/TrainingCard';
import { GENRE_LABELS, isGenreCode } from '@/lib/constants';
import { fetchCategories, fetchTrainings, filterTrainings } from '@/lib/queries';

// 管理画面での変更がすぐ反映されるよう、一覧は常に動的レンダリングにする。
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/list/[genre]'>): Promise<Metadata> {
  const { genre } = await params;

  if (!isGenreCode(genre)) {
    return { title: 'ページが見つかりません' };
  }

  return {
    title: GENRE_LABELS[genre],
    description: `${GENRE_LABELS[genre]}の練習メニュー集。カテゴリーやキーワードで探せます。`,
  };
}

export default async function GenreListPage({
  params,
  searchParams,
}: PageProps<'/list/[genre]'>) {
  const { genre } = await params;

  // ジャンルの検証は layout.tsx が済ませている（404 のステータスを正しく返すため）。
  // ここに来る genre は必ず定義済みだが、型を絞るために同じ判定を通す。
  if (!isGenreCode(genre)) return null;

  const search = await searchParams;

  const query = typeof search.q === 'string' ? search.q : '';
  const categorySlug =
    typeof search.category === 'string' ? search.category : '';

  // 種目もカテゴリーも、このジャンルのぶんだけを取る。
  // キーワード検索はこの絞り込み済みデータに対して行うので、同じジャンル内で閉じる。
  const [trainings, categories] = await Promise.all([
    fetchTrainings(genre),
    fetchCategories(genre),
  ]);

  const basePath = `/list/${genre}`;
  const filtered = filterTrainings(trainings, { query, categorySlug });
  const isFiltering = Boolean(query || categorySlug);

  return (
    <>
      <div className="flex flex-col gap-3">
        <Suspense fallback={<div className="min-h-[44px]" />}>
          <SearchBox query={query} />
        </Suspense>

        <CategoryChips
          categories={categories}
          selectedSlug={categorySlug}
          query={query}
          basePath={basePath}
        />
      </div>

      <p className="text-xs text-slate-500" aria-live="polite">
        {filtered.length}件
        {isFiltering && ` / 全${trainings.length}件`}
      </p>

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {filtered.map((training, index) => (
            <TrainingCard
              key={training.id}
              training={training}
              priority={index === 0}
            />
          ))}
        </ul>
      ) : (
        <EmptyState hasTrainings={trainings.length > 0} basePath={basePath} />
      )}

      <footer className="mt-2 border-t border-slate-200 pt-4">
        <SafetyNotice />
      </footer>
    </>
  );
}

/**
 * 空状態は2種類ある。
 * - そのジャンルにまだ1件も種目が無い → 準備中。絞り込みを外しても増えないので導線は出さない
 * - 絞り込んだ結果が0件 → 条件を外せば見つかるので「すべて表示に戻る」を出す
 */
function EmptyState({
  hasTrainings,
  basePath,
}: {
  hasTrainings: boolean;
  basePath: string;
}) {
  if (!hasTrainings) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
        <p className="text-4xl" aria-hidden="true">
          🚧
        </p>
        <p className="mt-3 text-sm text-slate-600">
          準備中です。
          <br />
          もうしばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <p className="text-4xl" aria-hidden="true">
        🔍
      </p>
      <p className="mt-3 text-sm text-slate-600">
        条件に合うトレーニングが見つかりませんでした。
      </p>
      <Link
        href={basePath}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-sky-600 px-5 text-sm font-bold text-white active:bg-sky-700"
      >
        すべて表示に戻る
      </Link>
    </div>
  );
}
