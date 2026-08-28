'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { CardSkeleton } from '@/components/Skeletons';
import { TrainingCard } from '@/components/TrainingCard';
import { GENRE_CODES, GENRE_LABELS } from '@/lib/constants';
import { pruneFavorites, useFavorites } from '@/lib/favorites';
import type { Training } from '@/lib/types';

/**
 * お気に入り一覧の本体。
 *
 * 種目そのものはサーバー側で取得済みのものを丸ごと受け取り、
 * 「どれがお気に入りか」だけをこの端末の localStorage から決める。
 * localStorage はサーバーで読めないので、絞り込みはここ（クライアント）で行う。
 */
export function FavoritesList({ trainings }: { trainings: Training[] }) {
  const favorites = useFavorites();

  const byId = useMemo(
    () => new Map(trainings.map((training) => [training.id, training])),
    [trainings],
  );

  // 管理画面で削除された種目の id が残っていたら、localStorage から取り除く。
  // 取り除くものが無ければ書き込まないので、これ以上の再レンダリングは起きない。
  useEffect(() => {
    if (favorites === null) return;
    pruneFavorites(new Set(byId.keys()));
  }, [favorites, byId]);

  // 読み込み前。件数が分からないので、代表してカード1枚分の骨組みを出す
  if (favorites === null) {
    return (
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <span className="sr-only">読み込み中です</span>
      </div>
    );
  }

  // 登録した順（新しいものが上）を保ったまま、実在する種目だけに絞る。
  // 消えた種目はここで落ちるので、上の useEffect が保存側も直す。
  const items = favorites
    .map((id) => byId.get(id))
    .filter((training): training is Training => training !== undefined);

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <p className="text-xs text-slate-500" aria-live="polite">
        {items.length}件
      </p>

      <ul className="flex flex-col gap-4">
        {items.map((training, index) => (
          <TrainingCard
            key={training.id}
            training={training}
            priority={index === 0}
            // お気に入りはジャンルが混ざるので、どちらの種目か分かるようにする
            showGenre
          />
        ))}
      </ul>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <p className="text-4xl" aria-hidden="true">
        ⭐
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        まだお気に入りがありません。
        <br />
        気になる種目のハートを押すとここに入ります。
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {GENRE_CODES.map((genre) => (
          <Link
            key={genre}
            href={`/list/${genre}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 active:bg-slate-100"
          >
            {GENRE_LABELS[genre]}を見る
          </Link>
        ))}
      </div>
    </div>
  );
}
