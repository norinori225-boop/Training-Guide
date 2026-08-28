import { GENRE_SHORT_LABELS } from '@/lib/constants';
import type { GenreCode } from '@/lib/types';

/**
 * ジャンルの短縮バッジ。
 * ジャンルが混ざる画面（お気に入り）で、どちらの種目か分かるように出す。
 */
export function GenreBadge({ genre }: { genre: GenreCode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {GENRE_SHORT_LABELS[genre]}
    </span>
  );
}
