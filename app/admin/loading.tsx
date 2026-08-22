export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-11 w-28 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="h-11 w-full animate-pulse rounded-full bg-slate-200" />
      <div className="flex flex-col gap-3">
        <div className="h-32 w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
      <span className="sr-only">読み込み中です</span>
    </div>
  );
}
