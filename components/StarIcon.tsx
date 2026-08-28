/**
 * お気に入りの星アイコン。アプリ全体でこの形だけを使う。
 *
 * 色だけで区別させないよう、登録済みは塗りつぶし・未登録は輪郭で形も変える。
 * 大きさは文字サイズ（1em）に合わせるので、置く側の text-* で調整する。
 */
export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[1em] w-[1em]"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.5l2.9 5.88 6.49.95-4.7 4.58 1.11 6.46L12 17.32l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.95L12 2.5Z" />
    </svg>
  );
}
