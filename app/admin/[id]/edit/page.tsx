import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { TrainingForm } from '@/components/TrainingForm';
import { fetchCategories, fetchTrainingById } from '@/lib/queries';

export const metadata: Metadata = { title: 'トレーニングの編集' };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminEditTrainingPage({
  params,
}: PageProps<'/admin/[id]/edit'>) {
  const { id } = await params;

  return (
    <AdminGuard>
      <EditTrainingForm id={id} />
    </AdminGuard>
  );
}

async function EditTrainingForm({ id }: { id: string }) {
  if (!UUID_PATTERN.test(id)) notFound();

  const [training, categories] = await Promise.all([
    fetchTrainingById(id),
    fetchCategories(),
  ]);

  if (!training) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-5 text-xl font-bold text-slate-900">
        トレーニングの編集
      </h1>
      <TrainingForm categories={categories} training={training} />
    </div>
  );
}
