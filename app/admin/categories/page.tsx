import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminGuard } from '@/components/AdminGuard';
import { CategoryManager } from '@/components/CategoryManager';
import { GenreTabs } from '@/components/GenreTabs';
import { DEFAULT_GENRE, isGenreCode } from '@/lib/constants';
import { fetchCategoriesWithUsage } from '@/lib/queries';
import type { GenreCode } from '@/lib/types';

export const metadata: Metadata = { title: 'カテゴリー管理' };

export default async function AdminCategoriesPage({
  searchParams,
}: PageProps<'/admin/categories'>) {
  const params = await searchParams;

  // カテゴリーは必ずどれかのジャンルに属するので「すべて」タブは作らない。
  // 追加フォームがどのジャンルで登録するのか曖昧にならないようにするため。
  const raw = typeof params.genre === 'string' ? params.genre : '';
  const genre: GenreCode = isGenreCode(raw) ? raw : DEFAULT_GENRE;

  return (
    <AdminGuard>
      <CategoryAdmin genre={genre} />
    </AdminGuard>
  );
}

async function CategoryAdmin({ genre }: { genre: GenreCode }) {
  const categories = await fetchCategoriesWithUsage(genre);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">カテゴリー管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          表示順は数値が小さいものから並びます。
        </p>
      </header>

      <GenreTabs basePath="/admin/categories" selected={genre} />

      <CategoryManager genre={genre} categories={categories} />

      <Link
        href="/admin"
        className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 active:text-sky-900"
      >
        ← トレーニング管理にもどる
      </Link>
    </div>
  );
}
