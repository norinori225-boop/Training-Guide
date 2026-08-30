/*
 * ODORIKOトレーニング のサービスワーカー。
 *
 * ■ 何のためにあるか
 * ホーム画面のアイコンから起動したとき、ネットワークの返事を待たずに
 * 前回の画面を即座に出すため。ここが無いと、電波が弱い場所では
 * 「タップしたのに白い画面のまま数秒」になる。
 *
 * ■ 方針（種類ごとに変えている）
 * - ページ（HTML）    … まずキャッシュを出す。裏で取り直して次回に備える
 * - /_next/static/*   … 中身が変わったら URL も変わるので、キャッシュ優先で使い回す
 * - 画像              … キャッシュを出しつつ裏で取り直す。増えすぎないよう上限あり
 * - それ以外          … 何もしない（素通し）
 *
 * ■ 「まずキャッシュ」の代償
 * 管理画面で種目を足した直後にアプリを起動すると、1回目は前回の内容が出て、
 * 2回目から新しくなる。ネットワークを待ってから表示する作りにすればズレは
 * 無くなるが、それでは電波の悪い場所で起動が遅いという元の問題に戻る。
 * 追加・編集をした本人のその場での確認は、下の「素通し」の対象になっている
 * ルーター用のデータ要求（RSC）と /admin を通るので、ズレずに見える。
 *
 * ■ 直したいときは
 * CACHE_VERSION を上げれば、古いキャッシュは activate ですべて捨てられる。
 */

const CACHE_VERSION = 'v1';
const PAGE_CACHE = `odoriko-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `odoriko-assets-${CACHE_VERSION}`;
const IMAGE_CACHE = `odoriko-images-${CACHE_VERSION}`;

const CURRENT_CACHES = [PAGE_CACHE, ASSET_CACHE, IMAGE_CACHE];

/** ネットワークもキャッシュも駄目だったときに出す画面 */
const OFFLINE_URL = '/offline.html';

/** 画像キャッシュに残す最大件数（古いものから捨てる） */
const IMAGE_CACHE_LIMIT = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // 入口とオフライン用の画面だけは先に持っておく。
      // 片方が取れなくても install は成功させたいので個別に扱う。
      await Promise.allSettled([
        cache.add(OFFLINE_URL),
        cache.add(new Request('/', { cache: 'reload' })),
      ]);
      // 新しい版を待たせずすぐ有効にする
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('odoriko-') && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      // 開いているタブにもこの版をすぐ効かせる
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // フォーム送信（Server Action）などは絶対に触らない
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 自分のサイト以外（YouTube の埋め込みなど）は素通し
  if (url.origin !== self.location.origin) return;

  // 管理画面はログイン状態で内容が変わるのでキャッシュしない
  if (url.pathname.startsWith('/admin')) return;

  // このファイル自身と、常に最新が要るものは素通し
  if (url.pathname === '/sw.js') return;

  // ルーターが画面遷移で使うデータ要求。
  // 同じ URL で HTML とは別物が返るため、キャッシュに混ぜると取り違える。
  // ここを素通しにしておくと、アプリを使っている最中の内容は常に最新になる。
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handlePage(request, url));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request, request, IMAGE_CACHE, IMAGE_CACHE_LIMIT));
  }
});

/**
 * ページ（HTML）。
 *
 * 保存するときは ?q= などを落として道（パス）だけを鍵にする。
 * 絞り込みはブラウザ側で行う作りなので（components/TrainingList.tsx）、
 * 同じ道なら中身は同じ。条件ごとに別々に貯めても無駄になる。
 */
function handlePage(request, url) {
  const key = new Request(url.origin + url.pathname);
  return staleWhileRevalidate(request, key, PAGE_CACHE, null, OFFLINE_URL);
}

/** 中身が変わったら URL も変わるもの向け。あればキャッシュ、無ければ取りに行く */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * あればキャッシュを即返し、裏で取り直して次回に備える。
 *
 * @param request   実際にネットワークへ投げる要求
 * @param key       キャッシュに出し入れするときの鍵（request と違ってよい）
 * @param limit     残す件数の上限。null なら無制限
 * @param fallback  キャッシュもネットワークも駄目だったときに返す URL
 */
async function staleWhileRevalidate(request, key, cacheName, limit, fallback) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key);

  const fresh = fetch(request)
    .then(async (response) => {
      // 404 やエラーを掴んだまま貯めない
      if (response.ok) {
        await cache.put(key, response.clone());
        if (limit) await trimCache(cache, limit);
      }
      return response;
    })
    .catch(() => null);

  if (hit) return hit;

  const response = await fresh;
  if (response) return response;

  if (fallback) {
    const offline = await cache.match(fallback);
    if (offline) return offline;
  }

  return Response.error();
}

/** 古いものから捨てて、件数を上限内に収める */
async function trimCache(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;

  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}
