/** 読み込み中のプレースホルダー（カード1枚分） */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-video w-full animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
