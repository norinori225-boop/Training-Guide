import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SafetyNotice } from '@/components/SafetyNotice';
import { ListSkeleton } from '@/components/Skeletons';
import { TrainingList } from '@/components/TrainingList';
import { GENRE_CODES, GENRE_LABELS, isGenreCode } from '@/lib/constants';
import { fetchCategories, fetchTrainings } from '@/lib/queries';

/**
 * 一覧は静的に作っておき、管理画面で変更があったときだけ作り直す
 * （app/actions/* の revalidatePath が呼ぶ）。
 * これで起動・遷移のたびにサーバー実行と Supabase 往復が走らなくなる。
 *
 * 数字は「revalidatePath が届かなかった場合の保険」。Supabase の管理画面から
 * 直接データを触ったときなど、アプリを通らない変更でも1時間で追いつく。
 */
export const revalidate = 3600;

/**
 * ジャンルは2本しかないので、両方ともビルド時に作っておく。
 * これを書かないと「最初に開いた人」だけがサーバー生成を待つことになる。
 */
export function generateStaticParams() {
  return GENRE_CODES.map((genre) => ({ genre }));
}

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
}: PageProps<'/list/[genre]'>) {
  const { genre } = await params;

  // ジャンルの検証は layout.tsx が済ませている（404 のステータスを正しく返すため）。
  // ここに来る genre は必ず定義済みだが、型を絞るために同じ判定を通す。
  if (!isGenreCode(genre)) return null;

  // 種目もカテゴリーも、このジャンルのぶんだけを取る。
  // 検索・絞り込みは URL の ?q= / ?category= を見て TrainingList が行う。
  // ここで searchParams を読まないので、このページは条件によらず1枚の
  // 静的 HTML になり、CDN から即返せる（TrainingList の説明も参照）。
  const [trainings, categories] = await Promise.all([
    fetchTrainings(genre),
    fetchCategories(genre),
  ]);

  return (
    <>
      {/* TrainingList は URL の絞り込み条件を読む＝ブラウザ側でしか確定しないので、
          静的 HTML には骨組みを入れておき、読み込み後に中身へ差し替える。 */}
      <Suspense fallback={<ListSkeleton />}>
        <TrainingList
          trainings={trainings}
          categories={categories}
          basePath={`/list/${genre}`}
        />
      </Suspense>

      <footer className="mt-2 border-t border-slate-200 pt-4">
        <SafetyNotice />
      </footer>
    </>
  );
}
