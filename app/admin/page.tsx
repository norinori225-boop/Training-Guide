import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminGuard } from '@/components/AdminGuard';
import { DeleteTrainingButton } from '@/components/DeleteTrainingButton';
import { GenreBadge } from '@/components/GenreBadge';
import { GenreTabs } from '@/components/GenreTabs';
import { IntensityBadge } from '@/components/IntensityBadge';
import { SignOutButton } from '@/components/SignOutButton';
import { getCurrentUser } from '@/lib/auth';
import { isGenreCode } from '@/lib/constants';
import { fetchTrainingsForAdmin } from '@/lib/queries';
import type { GenreCode } from '@/lib/types';

export const metadata: Metadata = { title: 'トレーニング管理' };

export default async function AdminPage({ searchParams }: PageProps<'/admin'>) {
  const params = await searchParams;

  // 絞り込みは URL に持たせる。保存後に戻ってきても同じタブが開いたままになる
  const raw = typeof params.genre === 'string' ? params.genre : '';
  const genre: GenreCode | null = isGenreCode(raw) ? raw : null;

  return (
    <AdminGuard>
      <AdminTrainingList genre={genre} />
    </AdminGuard>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function AdminTrainingList({ genre }: { genre: GenreCode | null }) {
  const [user, trainings] = await Promise.all([
    getCurrentUser(),
    fetchTrainingsForAdmin(genre ?? undefined),
  ]);

  // 絞り込み中のジャンルを、新規登録フォームの初期選択として引き継ぐ
  const newHref = genre ? `/admin/new?genre=${genre}` : '/admin/new';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">トレーニング管理</h1>
          <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
        </div>
        <SignOutButton />
      </header>

      <GenreTabs basePath="/admin" selected={genre} includeAll />

      <nav className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={newHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-sky-600 px-5 text-sm font-bold text-white active:bg-sky-700"
        >
          ＋新しいトレーニング
        </Link>
        <Link
          href="/admin/categories"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 active:bg-slate-100"
        >
          カテゴリー管理
        </Link>
      </nav>

      <p className="text-xs text-slate-500">{trainings.length}件</p>

      {trainings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-600">
          {genre
            ? 'このジャンルにはまだトレーニングがありません。'
            : 'まだトレーニングが登録されていません。'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trainings.map((training) => (
            <li
              key={training.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold leading-snug text-slate-900">
                  {training.title}
                </h2>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <IntensityBadge intensity={training.intensity} />
                  <GenreBadge genre={training.genre} />
                </div>
              </div>

              <ul className="mt-2 flex flex-wrap gap-1.5">
                {training.categories.map((category) => (
                  <li
                    key={category.id}
                    className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900"
                  >
                    {category.name}
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-xs text-slate-500">
                更新日: {formatDate(training.updated_at)}
              </p>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/admin/${training.id}/edit`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 active:bg-slate-100"
                >
                  編集
                </Link>
                <DeleteTrainingButton
                  trainingId={training.id}
                  title={training.title}
                />
                <Link
                  href={`/training/${training.id}`}
                  className="inline-flex min-h-[44px] items-center justify-center px-2 text-sm font-medium text-sky-700 active:text-sky-900"
                >
                  表示
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 active:text-sky-900"
      >
        ← 利用者側の画面を見る
      </Link>
    </div>
  );
}
