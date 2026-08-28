import Link from 'next/link';
import { EQUIPMENT_LABELS } from '@/lib/constants';
import type { Training } from '@/lib/types';
import { FavoriteButton } from '@/components/FavoriteButton';
import { GenreBadge } from '@/components/GenreBadge';
import { IntensityBadge } from '@/components/IntensityBadge';
import { TrainingThumbnail } from '@/components/TrainingThumbnail';

/** カードに並べる最大件数。超えた分は「＋N」にまとめる。 */
const MAX_VISIBLE = 2;

function splitOverflow<T>(items: T[]) {
  return {
    visible: items.slice(0, MAX_VISIBLE),
    overflow: Math.max(0, items.length - MAX_VISIBLE),
  };
}

/**
 * 一覧カード。
 * 対象年齢と推奨人数は情報過多になるので、カードには出さず詳細ページに出す。
 */
export function TrainingCard({
  training,
  priority = false,
  showGenre = false,
}: {
  training: Training;
  priority?: boolean;
  /** ジャンルが混ざる画面（お気に入り）でだけ true にする */
  showGenre?: boolean;
}) {
  const categories = splitOverflow(training.categories);
  const equipment = splitOverflow(training.equipment);

  return (
    // ハートはリンクの「中」に置かない。<a> の中に <button> を入れると
    // HTML として不正で、タップの扱いもブラウザ任せになるため、
    // 兄弟として重ねて置く（li を relative にして絶対配置）。
    <li className="relative">
      <Link
        href={`/training/${training.id}`}
        className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition active:bg-slate-50 sm:hover:border-slate-300 sm:hover:shadow"
      >
        <div className="relative aspect-video w-full bg-slate-200">
          <TrainingThumbnail
            thumbnailUrl={training.thumbnail_url}
            youtubeUrl={training.youtube_url}
            title={training.title}
            priority={priority}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold leading-snug text-slate-900">
              {training.title}
            </h2>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <IntensityBadge intensity={training.intensity} />
              {showGenre && <GenreBadge genre={training.genre} />}
            </div>
          </div>

          {/* カテゴリー: 先頭2件＋「＋N」。順序は categories.sort_order 昇順 */}
          <ul className="mt-2 flex flex-wrap items-center gap-1.5">
            {categories.visible.map((category) => (
              <li
                key={category.id}
                className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900"
              >
                {category.name}
              </li>
            ))}
            {categories.overflow > 0 && (
              <li className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                ＋{categories.overflow}
              </li>
            )}
          </ul>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {training.short_description}
          </p>

          {/* 道具: 先頭2件＋「＋N」（小さめのラベル） */}
          <ul className="mt-3 flex flex-wrap items-center gap-1.5">
            <li className="text-[11px] text-slate-500">道具</li>
            {equipment.visible.map((code) => (
              <li
                key={code}
                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
              >
                {EQUIPMENT_LABELS[code]}
              </li>
            ))}
            {equipment.overflow > 0 && (
              <li className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">
                ＋{equipment.overflow}
              </li>
            )}
          </ul>
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <FavoriteButton trainingId={training.id} />
      </div>
    </li>
  );
}
