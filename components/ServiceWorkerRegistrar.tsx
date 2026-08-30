'use client';

import { useEffect } from 'react';

/**
 * サービスワーカー（public/sw.js）を登録するだけの部品。画面には何も出さない。
 *
 * これを入れると、ホーム画面から起動したときにネットワークの返事を待たず
 * 前回の画面を出せるようになる（詳しくは public/sw.js の先頭を参照）。
 *
 * 開発中は登録しない。dev サーバーの出力をキャッシュされると、コードを直しても
 * 古い画面が出続けて原因が分からなくなるため。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error) => {
        // 登録できなくてもアプリは普通に動く（起動が速くならないだけ）ので、
        // 画面には出さずログだけ残す。
        console.error('[sw] 登録に失敗しました', error);
      });
  }, []);

  return null;
}
