'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * サービスワーカー（public/sw.js）の登録と、内容の取り直し。
 * 画面には何も出さない。
 *
 * これを入れると、ホーム画面から起動したときにネットワークの返事を待たず
 * 前回の画面を出せるようになる（詳しくは public/sw.js の先頭を参照）。
 *
 * 開発中は登録しない。dev サーバーの出力をキャッシュされると、コードを直しても
 * 古い画面が出続けて原因が分からなくなるため。
 */

/** public/sw.js の同名の定数と揃えること */
const CHECK_MESSAGE = 'odoriko:was-it-stale';
const PAGE_UPDATED_MESSAGE = 'odoriko:page-updated';

export function ServiceWorkerRegistrar() {
  const router = useRouter();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    /**
     * 「さっき出した画面は古かった」という返事。
     *
     * router.refresh() はサーバーから最新を取り直して差し替えるだけで、
     * 入力欄などの状態は保たれる。検索中に届いても打った文字は消えない。
     */
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== PAGE_UPDATED_MESSAGE) return;
      router.refresh();
    };

    navigator.serviceWorker.addEventListener('message', onMessage);

    /*
     * この画面がサービスワーカーのキャッシュから出されたものなら、
     * それが古くなかったかを聞く。古ければ上の onMessage が返ってくる。
     *
     * 逆向き（ワーカーから知らせる）にしないのは、取り直しが終わるほうが
     * ここに辿り着くより速く、知らせを取りこぼすため。実際に取りこぼした。
     */
    navigator.serviceWorker.controller?.postMessage({
      type: CHECK_MESSAGE,
      url: window.location.href,
    });

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((error) => {
          // 登録できなくてもアプリは普通に動く（起動が速くならないだけ）ので、
          // 画面には出さずログだけ残す。
          console.error('[sw] 登録に失敗しました', error);
        });
    }

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [router]);

  return null;
}
