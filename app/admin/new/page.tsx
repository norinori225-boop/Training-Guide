import type { Metadata } from 'next';
import { AdminGuard } from '@/components/AdminGuard';
import { TrainingForm } from '@/components/TrainingForm';
import { fetchCategories } from '@/lib/queries';

export const metadata: Metadata = { title: '新しいトレーニング' };

export default function AdminNewTrainingPage() {
  return (
    <AdminGuard>
      <NewTrainingForm />
    </AdminGuard>
  );
}

async function NewTrainingForm() {
  const categories = await fetchCategories();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-5 text-xl font-bold text-slate-900">
        新しいトレーニング
      </h1>
      <TrainingForm categories={categories} />
    </div>
  );
}
