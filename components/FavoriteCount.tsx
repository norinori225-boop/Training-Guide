'use client';

import { useFavorites } from '@/lib/favorites';

/**
 * 入口に出すお気に入りの件数バッジ。
 *
 * 件数は端末内にしかないのでクライアントで数える。
 * 読み込み前と0件のときは何も描かない（「0件」とは出さない）。
 */
export function FavoriteCount({ className }: { className?: string }) {
  const favorites = useFavorites();

  if (favorites === null || favorites.length === 0) return null;

  return <span className={className}>{favorites.length}件</span>;
}
