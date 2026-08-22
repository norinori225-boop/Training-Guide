import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CategoryChips } from '@/components/CategoryChips';
import { SafetyNotice } from '@/components/SafetyNotice';
import { SearchBox } from '@/components/SearchBox';
import { TrainingCard } from '@/components/TrainingCard';
import { fetchCategories, fetchTrainings, filterTrainings } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'アジリティートレーニング',
  description:
    '親子でできる、すばやく動くための練習メニュー集。カテゴリーやキーワードで探せます。',
};

// 管理画面での変更がすぐ反映されるよう、一覧は常に動的レンダリングにする。
export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;

  const query = typeof params.q === 'string' ? params.q : '';
  const categorySlug =
    typeof params.category === 'string' ? params.category : '';

  // 1クエリで取得してサーバー側で絞り込む（N+1 にしない）
  const [trainings, categories] = await Promise.all([
    fetchTrainings(),
    fetchCategories(),
  ]);

  const filtered = filterTrainings(trainings, { query, categorySlug });
  const isFiltering = Boolean(query || categorySlug);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">
          アジリティートレーニング
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          親子でできる、すばやく動くための練習メニュー集
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Suspense fallback={<div className="min-h-[44px]" />}>
          <SearchBox query={query} />
        </Suspense>

        <CategoryChips
          categories={categories}
          selectedSlug={categorySlug}
          query={query}
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
        <EmptyState hasTrainings={trainings.length > 0} />
      )}

      <footer className="mt-2 border-t border-slate-200 pt-4">
        <SafetyNotice />
      </footer>
    </div>
  );
}

function EmptyState({ hasTrainings }: { hasTrainings: boolean }) {
  if (!hasTrainings) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
        <p className="text-sm text-slate-600">
          まだトレーニングが登録されていません。
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
        href="/"
        className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-sky-600 px-5 text-sm font-bold text-white active:bg-sky-700"
      >
        すべて表示に戻る
      </Link>
    </div>
  );
}
