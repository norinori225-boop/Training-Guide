import { CardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    // 「← ホーム」と見出しは layout が先に描くので、ここには含めない
    <div className="flex flex-col gap-5">
      <div className="h-11 w-full animate-pulse rounded-full bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-11 w-20 animate-pulse rounded-full bg-slate-200" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-slate-200" />
        <div className="h-11 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <span className="sr-only">読み込み中です</span>
    </div>
  );
}
