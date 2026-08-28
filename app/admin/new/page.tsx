import type { Metadata } from 'next';
import { AdminGuard } from '@/components/AdminGuard';
import { TrainingForm } from '@/components/TrainingForm';
import { isGenreCode } from '@/lib/constants';
import { fetchCategories } from '@/lib/queries';
import type { GenreCode } from '@/lib/types';

export const metadata: Metadata = { title: '新しいトレーニング' };

export default async function AdminNewTrainingPage({
  searchParams,
}: PageProps<'/admin/new'>) {
  const params = await searchParams;

  // 管理一覧で絞り込んでいたジャンルを初期選択として引き継ぐ
  const raw = typeof params.genre === 'string' ? params.genre : '';
  const initialGenre: GenreCode | undefined = isGenreCode(raw) ? raw : undefined;

  return (
    <AdminGuard>
      <NewTrainingForm initialGenre={initialGenre} />
    </AdminGuard>
  );
}

async function NewTrainingForm({ initialGenre }: { initialGenre?: GenreCode }) {
  // ジャンルタブの切り替えでその場で差し替えるので、全ジャンルぶん渡す
  const categories = await fetchCategories();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-5 text-xl font-bold text-slate-900">
        新しいトレーニング
      </h1>
      <TrainingForm categories={categories} initialGenre={initialGenre} />
    </div>
  );
}
