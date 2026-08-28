import { CardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
      <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
      <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="flex flex-col gap-4">
        <CardSkeleton />
      </div>
      <span className="sr-only">読み込み中です</span>
    </div>
  );
}
