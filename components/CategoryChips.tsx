import Link from 'next/link';
import type { Category } from '@/lib/types';

/**
 * カテゴリー絞り込みチップ（単一選択・横スクロール）。
 * リンクなので JS 無しでも動く。多対多なので「選択したカテゴリーを含む」種目が出る。
 */
export function CategoryChips({
  categories,
  selectedSlug,
  query,
}: {
  categories: Category[];
  selectedSlug: string;
  query: string;
}) {
  const buildHref = (slug: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (slug) params.set('category', slug);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
  };

  const chips = [{ id: 'all', slug: '', name: 'すべて' }, ...categories];

  return (
    <nav aria-label="カテゴリーで絞り込む">
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((chip) => {
          const isSelected = chip.slug === selectedSlug;

          return (
            <li key={chip.id} className="snap-start">
              <Link
                href={buildHref(chip.slug)}
                aria-current={isSelected ? 'true' : undefined}
                className={`flex min-h-[44px] items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition ${
                  isSelected
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 active:bg-slate-100'
                }`}
              >
                {chip.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
