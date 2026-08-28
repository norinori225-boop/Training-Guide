'use client';

import { useSyncExternalStore } from 'react';

/**
 * お気に入りの保存場所。
 *
 * 画面からは localStorage を直接触らず、必ずこのファイル越しに読み書きする。
 * 将来ログイン方式（サーバー保存）へ差し替えるときは、ここだけを書き換えれば
 * 画面側は変えずに済む。
 *
 * 保存するのはトレーニングの id だけ。題名やサムネイルのコピーは持たない
 * （管理画面で直しても古い情報が残り続けてしまうため）。
 */

const STORAGE_KEY = 'favorites:v1';

/**
 * 「まだ読み込んでいない」を表す値。
 * localStorage はサーバーでは読めないので、SSR とハイドレーション中はこれを返す。
 * 空配列と区別できるようにしておくことで、画面側が「0件」と「読み込み前」を
 * 出し分けられる（未選択の星が一瞬ちらつくのを防ぐ）。
 */
const FAVORITES_UNLOADED = null;

/**
 * 直近のスナップショット。
 * useSyncExternalStore は毎回同じ参照を返さないと再レンダリングし続けるので、
 * 読み込んだ配列をここに保持して、変更があったときだけ作り直す。
 */
let snapshot: readonly string[] | null = null;

const listeners = new Set<() => void>();

/* ------------------------------------------------------------------ */
/* localStorage の読み書き（例外は必ずここで吸収する）                    */
/* ------------------------------------------------------------------ */

/**
 * プライベートウィンドウや「サイトデータをブロック」設定では、
 * localStorage へのアクセス自体が例外を投げる。
 * その場合はお気に入り0件として扱い、アプリは普通に使えるようにする。
 */
function readStorage(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // 手で書き換えられていても落ちないよう、文字列以外と重複は捨てる
    return Array.from(
      new Set(parsed.filter((value): value is string => typeof value === 'string')),
    );
  } catch {
    return [];
  }
}

/** 書き込みに失敗しても（容量超過・保存禁止など）画面は動かし続ける */
function writeStorage(ids: readonly string[]): void {
  snapshot = ids;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 保存できなくても、この画面を開いている間は snapshot が効いている
  }

  for (const listener of listeners) listener();
}

/* ------------------------------------------------------------------ */
/* 公開API                                                             */
/* ------------------------------------------------------------------ */

/** 現在のお気に入り id 一覧（登録順・新しいものが先頭） */
export function getFavorites(): readonly string[] {
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

/** 入っていれば外し、入っていなければ先頭に足す。結果の一覧を返す */
export function toggleFavorite(id: string): readonly string[] {
  const current = getFavorites();

  const next = current.includes(id)
    ? current.filter((value) => value !== id)
    : [id, ...current];

  writeStorage(next);
  return next;
}

/** id がお気に入りに入っているか */
export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

/** id をお気に入りから外す。入っていなければ何もしない */
export function removeFavorite(id: string): readonly string[] {
  const current = getFavorites();
  if (!current.includes(id)) return current;

  const next = current.filter((value) => value !== id);
  writeStorage(next);
  return next;
}

/**
 * 実在する id の集合を渡して、消えた種目を取り除く（自己修復）。
 * 管理画面で削除された種目がお気に入りに残り続けないようにするため。
 * 取り除くものが無ければ書き込まない。
 */
export function pruneFavorites(existingIds: ReadonlySet<string>): readonly string[] {
  const current = getFavorites();
  const next = current.filter((id) => existingIds.has(id));

  if (next.length === current.length) return current;

  writeStorage(next);
  return next;
}

/* ------------------------------------------------------------------ */
/* React から購読する                                                   */
/* ------------------------------------------------------------------ */

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // 別タブで変更されたときに追従する
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    for (const current of listeners) current();
  };

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * お気に入り一覧を購読する。
 *
 * 戻り値が `null` の間は「まだ読み込んでいない」。
 * SSR とハイドレーション中は必ず null になるので、サーバーとクライアントで
 * 出力がズレない＝ハイドレーション不一致もチラつきも起きない。
 * ハイドレーションが終わると React が再レンダリングし、実際の値に入れ替わる。
 */
export function useFavorites(): readonly string[] | null {
  return useSyncExternalStore(subscribe, getFavorites, () => FAVORITES_UNLOADED);
}
