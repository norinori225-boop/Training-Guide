'use client';

import { toggleFavorite, useFavorites } from '@/lib/favorites';

/**
 * お気に入りのハートボタン。
 *
 * 読み込み前（SSR・ハイドレーション中）はニュートラルな輪郭のハートを出す。
 * localStorage を読めるようになってから塗りつぶしに切り替わるので、
 * 「一瞬全部が未選択に見えてから点灯する」というチラつきが起きない。
 */
export function FavoriteButton({
  trainingId,
  size = 'md',
}: {
  trainingId: string;
  /** md: 一覧カード用 / lg: 詳細ページ用 */
  size?: 'md' | 'lg';
}) {
  const favorites = useFavorites();

  const isLoaded = favorites !== null;
  const isOn = isLoaded && favorites.includes(trainingId);

  const label = isOn ? 'お気に入りから外す' : 'お気に入りに追加';

  return (
    <button
      type="button"
      // 読み込みが終わるまでは押させない（押しても正しく反映できないため）
      disabled={!isLoaded}
      aria-label={label}
      aria-pressed={isOn}
      title={label}
      onClick={(event) => {
        // カード全体がリンクなので、押したときにページ遷移させない。
        // ボタンは <Link> の外に置いてあるが、構造が変わっても事故らないよう
        // ここでも伝播と既定動作を止めておく。
        event.preventDefault();
        event.stopPropagation();

        // 保存はここだけ。お気に入り一覧など他の表示は useFavorites() 経由で
        // 同じストアを見ているので、コールバックを配らなくても一緒に更新される。
        toggleFavorite(trainingId);
      }}
      className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-sm backdrop-blur transition active:scale-95 disabled:cursor-default ${
        size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-11 w-11 text-xl'
      } ${isOn ? 'text-rose-500' : 'text-slate-400'}`}
    >
      <HeartIcon filled={isOn} />
    </button>
  );
}

/**
 * 色だけで区別させないよう、選択中は塗りつぶし・未選択は輪郭で形も変える。
 * 状態そのものは aria-pressed で読み上げられる。
 */
function HeartIcon({ filled }: { filled: boolean }) {
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
      <path d="M12 20.5s-7.5-4.7-7.5-9.7a4.3 4.3 0 0 1 7.5-2.9 4.3 4.3 0 0 1 7.5 2.9c0 5-7.5 9.7-7.5 9.7Z" />
    </svg>
  );
}
