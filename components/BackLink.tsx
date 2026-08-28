'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 「もどる」リンク。
 *
 * - アプリ内を辿ってきた場合（ブラウザ履歴がある）→ 履歴を1つ戻る。
 *   直前に見ていた一覧のスクロール位置と絞り込み条件がそのまま残る。
 * - 共有リンクなどで直接開かれた場合（履歴が無い）→ fallbackHref へ進む。
 *   詳細ページは共有される前提なので、行き止まりを作らない。
 *
 * 中身は普通の <Link> なので、JS が動かない環境でも fallbackHref へ移動できる。
 * 履歴の有無はクリックされた時点で見る（レンダー中には判定しないので、
 * サーバーとクライアントで出力がズレない）。
 */
export function BackLink({
  fallbackHref,
  className,
  children,
}: {
  fallbackHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={fallbackHref}
      className={className}
      onClick={(event) => {
        // 新しいタブで開く操作（修飾キー・中クリック）は邪魔しない
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }

        // 履歴が自分1件だけ＝直リンクで開かれた。この場合は戻らず fallback へ進む
        if (window.history.length <= 1) return;

        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
