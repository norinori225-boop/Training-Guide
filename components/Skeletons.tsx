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

/**
 * 一覧（検索欄＋チップ＋カード）の読み込み中表示。
 * loading.tsx（ルート遷移中）と、page.tsx の Suspense 境界
 * （URL の絞り込み条件を読むまでの間）の両方で使う。
 */
export function ListSkeleton() {
  return (
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
