'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { CategoryChips } from '@/components/CategoryChips';
import { SearchBox } from '@/components/SearchBox';
import { TrainingCard } from '@/components/TrainingCard';
import { filterTrainings } from '@/lib/filter';
import type { Category, Training } from '@/lib/types';

/**
 * ジャンル別一覧の本体（検索・絞り込み・カード表示）。
 *
 * 種目とカテゴリーはサーバー側で取得済みのものを丸ごと受け取り、
 * 「どれを表示するか」だけをこの中（クライアント）で決める。
 *
 * ■ なぜサーバーで絞り込まないのか
 * 絞り込み条件は URL の ?q= と ?category= にある。これをページ本体
 * （Server Component）で読むと、その URL ごとにサーバー実行が必要になり
 * ページを CDN にキャッシュできない＝起動のたびにサーバー往復が発生する。
 * 条件の読み取りをここへ移すと、ページ自体は条件に依存しない1枚の静的
 * HTML になり、CDN から即座に返せる（ホーム画面からの起動が速くなる）。
 * ついでに、検索の1文字ごと・チップの1タップごとに走っていたサーバー往復も
 * 無くなるので、絞り込み自体も即座に反映される。
 *
 * MVP の想定件数は100件（lib/queries.ts の TRAINING_FETCH_LIMIT）なので、
 * 端末側で毎回全件を走査しても体感に響かない。ページネーションを入れる
 * ときは、この分担も含めて見直すこと。
 */
export function TrainingList({
  trainings,
  categories,
  basePath,
}: {
  trainings: Training[];
  categories: Category[];
  /** 自分が置かれている一覧の URL（例: /list/body-play）。チップのリンク先に使う */
  basePath: string;
}) {
  const searchParams = useSearchParams();

  const query = searchParams.get('q') ?? '';
  const categorySlug = searchParams.get('category') ?? '';

  const filtered = useMemo(
    () => filterTrainings(trainings, { query, categorySlug }),
    [trainings, query, categorySlug],
  );

  const isFiltering = Boolean(query || categorySlug);

  return (
    <>
      <div className="flex flex-col gap-3">
        <SearchBox query={query} />

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
