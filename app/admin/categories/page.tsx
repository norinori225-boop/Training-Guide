import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminGuard } from '@/components/AdminGuard';
import { CategoryManager } from '@/components/CategoryManager';
import { fetchCategoriesWithUsage } from '@/lib/queries';

export const metadata: Metadata = { title: 'カテゴリー管理' };

export default function AdminCategoriesPage() {
  return (
    <AdminGuard>
      <CategoryAdmin />
    </AdminGuard>
  );
}

async function CategoryAdmin() {
  const categories = await fetchCategoriesWithUsage();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">カテゴリー管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          表示順は数値が小さいものから並びます。
        </p>
      </header>

      <CategoryManager categories={categories} />

      <Link
        href="/admin"
        className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 active:text-sky-900"
      >
        ← トレーニング管理にもどる
      </Link>
    </div>
  );
}
