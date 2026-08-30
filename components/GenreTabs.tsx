import Link from 'next/link';
import { GENRE_CODES, GENRE_SHORT_LABELS } from '@/lib/constants';
import type { GenreCode } from '@/lib/types';

/**
 * 管理画面のジャンルタブ（リンク版）。
 *
 * 状態を URL の ?genre= に持たせるので、リロードしても選択が残り、
 * 保存後に戻ってきたときも同じタブが開いている。
 *
 * 各タブは prefetch を明示している。管理画面は毎回サーバーで組み立てる
 * ページなので、既定のままだと読み込み中の骨組みまでしか先読みされず、
 * 中身はタップしてから取りに行くことになる（＝切り替えのたびに待つ）。
 * タブは常に画面の上に出ていて先読みが確実に走るうえ、数も2〜3本しかない。
 */
export function GenreTabs({
  basePath,
  selected,
  includeAll = false,
}: {
  basePath: string;
  /** 選択中のジャンル。null は「すべて」 */
  selected: GenreCode | null;
  /** 「すべて」タブを出すか（トレーニング管理のみ true） */
  includeAll?: boolean;
}) {
  const tabs: { key: string; label: string; href: string; isSelected: boolean }[] = [];

  if (includeAll) {
    tabs.push({
      key: 'all',
      label: 'すべて',
      href: basePath,
      isSelected: selected === null,
    });
  }

  for (const genre of GENRE_CODES) {
    tabs.push({
      key: genre,
      label: GENRE_SHORT_LABELS[genre],
      href: `${basePath}?genre=${genre}`,
      isSelected: selected === genre,
    });
  }

  return (
    <nav aria-label="ジャンルで絞り込む">
      <ul className="flex gap-2">
        {tabs.map((tab) => (
          <li key={tab.key} className="flex-1">
            <Link
              href={tab.href}
              prefetch
              aria-current={tab.isSelected ? 'true' : undefined}
              className={`flex min-h-[44px] items-center justify-center rounded-full border px-3 text-sm font-bold transition ${
                tab.isSelected
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 active:bg-slate-100'
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
