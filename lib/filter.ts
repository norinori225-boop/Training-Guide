import { equipmentCodesByKeyword } from '@/lib/constants';
import type { Training } from '@/lib/types';

/**
 * キーワード検索とカテゴリー絞り込み。
 *
 * lib/queries.ts（Supabase クライアントを持つ＝サーバー専用）から切り出してある。
 * 絞り込みはクライアント側（components/TrainingList.tsx）で走らせるので、
 * ここに supabase-js を巻き込むとブラウザ側のバンドルに入ってしまうため。
 * このファイルは constants と型しか import しないこと。
 *
 * 検索対象: 題名 / 簡単な説明 / 詳しい説明 / カテゴリー名 / 道具の表示名 /
 *           「その他」の道具名（equipment_other）
 * 道具は DB にコード値（ladder 等）で入っているので、lib/constants.ts の
 * 逆引きで検索語をコード値へ変換してから突き合わせる（「ラダー」→ ladder）。
 * 「その他」の道具名だけはコード値ではなく生の文字列なので、題名などと同じ
 * 部分一致で拾う（「なわとび」でその道具を使う種目が出る）。
 */
export function filterTrainings(
  trainings: Training[],
  options: { query?: string; categorySlug?: string },
): Training[] {
  const query = (options.query ?? '').trim().toLowerCase();
  const categorySlug = options.categorySlug ?? '';

  // 検索語に部分一致する道具コード（例:「ラダー」→ ['ladder']）
  const equipmentCodes = query ? equipmentCodesByKeyword(query) : [];

  return trainings.filter((training) => {
    if (categorySlug) {
      const hasCategory = training.categories.some((c) => c.slug === categorySlug);
      if (!hasCategory) return false;
    }

    if (!query) return true;

    const haystack = [
      training.title,
      training.short_description,
      training.description,
      training.equipment_other ?? '',
      ...training.categories.map((c) => c.name),
    ]
      .join('\n')
      .toLowerCase();

    if (haystack.includes(query)) return true;

    return equipmentCodes.some((code) => training.equipment.includes(code));
  });
}
