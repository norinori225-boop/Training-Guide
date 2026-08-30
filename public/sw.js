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
 * ■ 先に出したものが古かったときの後始末
 * キャッシュを先に出す以上、管理画面で種目を足した直後の起動では、一度は
 * 前回の内容が出てしまう。これを「次に起動するまで古いまま」で終わらせない
 * ために、裏で取り直した結果が前回と違っていたかを覚えておき、画面側から
 * 聞かれたら答える（revalidations と CHECK_MESSAGE）。
 * 聞いた側（components/ServiceWorkerRegistrar.tsx）が router.refresh() を
 * 呼ぶので、開いたまま新しい内容に入れ替わる。
 *
 * 「こちらから知らせる」形にしないのは、取り直しがミリ秒で終わるのに対して
 * 画面側が受け取れるようになるのはハイドレーション後で、ほぼ確実に取りこぼす
 * ため。画面側から聞きに行けば、取り直しの途中でも終わったあとでも拾える。
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

/**
 * 画面側とやりとりする合図。
 * components/ServiceWorkerRegistrar.tsx と揃えること。
 */
const CHECK_MESSAGE = 'odoriko:was-it-stale';
const PAGE_UPDATED_MESSAGE = 'odoriko:page-updated';

/**
 * 「今出したページの取り直し」の控え。URL → 「前回と違っていたか」の約束。
 *
 * 取り直しの最中に聞かれても答えられるよう、結果ではなく約束（Promise）を
 * 入れている。一度答えたら消す。
 */
const revalidations = new Map();

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

/**
 * 「さっき自分に出してくれたページ、古くなかった？」への返事。
 *
 * 取り直しがまだ終わっていなければ、終わるまで待ってから答える。
 * 違っていた場合だけ返事を出し、受け取った画面が中身を取り直す。
 */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== CHECK_MESSAGE || typeof data.url !== 'string') return;

  event.waitUntil(
    (async () => {
      const url = new URL(data.url);
      const key = url.origin + url.pathname;

      const pending = revalidations.get(key);
      if (!pending) return;
      revalidations.delete(key);

      if (await pending) {
        event.source?.postMessage({ type: PAGE_UPDATED_MESSAGE });
      }
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
    event.respondWith(handlePage(event, request, url));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      staleWhileRevalidate(event, request, request, IMAGE_CACHE, {
        limit: IMAGE_CACHE_LIMIT,
      }),
    );
  }
});

/**
 * ページ（HTML）。
 *
 * 保存するときは ?q= などを落として道（パス）だけを鍵にする。
 * 絞り込みはブラウザ側で行う作りなので（components/TrainingList.tsx）、
 * 同じ道なら中身は同じ。条件ごとに別々に貯めても無駄になる。
 */
function handlePage(event, request, url) {
  const key = new Request(url.origin + url.pathname);
  return staleWhileRevalidate(event, request, key, PAGE_CACHE, {
    fallback: OFFLINE_URL,
    // 古いものを出していたら画面側に答えられるようにする（先頭の説明を参照）
    trackChanges: true,
  });
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
 * @param event   この応答のもとになった fetch イベント
 * @param request 実際にネットワークへ投げる要求
 * @param key     キャッシュに出し入れするときの鍵（request と違ってよい）
 * @param options.limit         残す件数の上限。省略なら無制限
 * @param options.fallback      キャッシュもネットワークも駄目なときに返す URL
 * @param options.trackChanges  古いものを出したかどうかを控えておくか
 */
async function staleWhileRevalidate(event, request, key, cacheName, options = {}) {
  const { limit, fallback, trackChanges } = options;

  const cache = await caches.open(cacheName);
  const hit = await cache.match(key);

  // hit は呼び出し元へ返すので、比べる用には複製を取る（本文は一度しか読めない）
  const previous = trackChanges && hit ? hit.clone() : null;

  const fresh = fetch(request)
    .then(async (response) => {
      // 404 やエラーを掴んだまま貯めない
      if (!response.ok) return { response, changed: false };

      const forCompare = previous ? response.clone() : null;
      await cache.put(key, response.clone());
      if (limit) await trimCache(cache, limit);

      const changed = forCompare ? await hasChanged(previous, forCompare) : false;
      return { response, changed };
    })
    .catch(() => null);

  if (hit) {
    if (trackChanges) {
      revalidations.set(key.url, fresh.then((result) => Boolean(result && result.changed)));
    }
    // キャッシュを返したあとも取り直しを最後までやらせる。
    // これが無いと、応答を返した時点でワーカーが止められることがある。
    event.waitUntil(fresh);
    return hit;
  }

  const result = await fresh;
  if (result) return result.response;

  if (fallback) {
    const offline = await cache.match(fallback);
    if (offline) return offline;
  }

  return Response.error();
}

/**
 * 前に返したものと、取り直したものが違うかどうか。
 *
 * ETag があればそれだけで判定できる（本文を読まずに済む）。
 * 無い場合だけ本文どうしを突き合わせる。
 */
async function hasChanged(previous, fresh) {
  const previousTag = previous.headers.get('ETag');
  const freshTag = fresh.headers.get('ETag');
  if (previousTag && freshTag) return previousTag !== freshTag;

  const [before, after] = await Promise.all([previous.text(), fresh.text()]);
  return before !== after;
}

/** 古いものから捨てて、件数を上限内に収める */
async function trimCache(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;

  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}
