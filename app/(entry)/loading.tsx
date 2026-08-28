/**
 * 入口画面の読み込み中表示（ジャンルごとの件数を数えている間）。
 *
 * このファイルを `app/loading.tsx`（ルート直下）に置いてはいけない。
 * ルート直下に置くと `/list/[genre]` より外側に Suspense 境界ができ、
 * ジャンル検証の前に 200 のヘッダーが送信されてしまうため、存在しない
 * ジャンルが 404 ではなく 200 を返すようになる。
 * (entry) グループに閉じ込めることで、入口だけに効かせている。
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 py-6">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-200" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="h-[88px] w-full animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[88px] w-full animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[88px] w-full animate-pulse rounded-2xl bg-slate-200" />
      </div>

      <span className="sr-only">読み込み中です</span>
    </div>
  );
}
