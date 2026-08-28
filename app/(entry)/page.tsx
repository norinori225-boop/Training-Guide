import type { Metadata } from 'next';
import Link from 'next/link';
import { FavoriteCount } from '@/components/FavoriteCount';
import { SafetyNotice } from '@/components/SafetyNotice';
import { StarIcon } from '@/components/StarIcon';
import { GENRE_CODES, GENRE_OPTIONS } from '@/lib/constants';
import { fetchTrainingCount } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'ODORIKOトレーニング',
  description:
    '親子でできる、すばやく動くための練習メニュー集。ジャンルを選んで種目を探せます。',
};

// 件数とカテゴリーは管理画面の変更をすぐ反映したいので、常に動的レンダリングにする。
export const dynamic = 'force-dynamic';

/** 件数バッジの見た目。種目数（サーバー）とお気に入り数（クライアント）で共用する */
const COUNT_BADGE_CLASS =
  'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600';

/** 使い方の3ステップ */
const HOW_TO_STEPS = [
  'やりたい種目を探す',
  '動画とやり方を見て、必要な道具をそろえる',
  'チェックリストを確認しながら、安全に取り組む',
];

export default async function HomePage() {
  // 入口では件数しか使わないので、行は取らずに count だけを数える。
  // ジャンルは GENRE_CODES から回すので、増えても自動で並ぶ。
  const counts = await Promise.all(
    GENRE_CODES.map((genre) => fetchTrainingCount(genre)),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          ODORIKOトレーニング
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          親子でできる、すばやく動くための練習メニュー集
        </p>
      </header>

      {/* 入口の主役。スマホで迷わず押せるよう、縦1列の大きなボタンにする */}
      <nav aria-label="メニュー">
        <ul className="flex flex-col gap-3">
          {GENRE_OPTIONS.map((option, index) => (
            <li key={option.code}>
              <MenuButton
                href={`/list/${option.code}`}
                icon={option.icon}
                title={option.label}
                description={option.description}
                count={counts[index]}
              />
            </li>
          ))}
          <li>
            <MenuButton
              href="/favorites"
              // 絵文字のジャンルアイコンと並ぶので、星にも色を付ける
              icon={
                <span className="text-amber-500">
                  <StarIcon filled />
                </span>
              }
              title="お気に入り"
              description="あとでやりたい種目をまとめて見る"
              // 件数は端末内にしかないので、サーバーでは数えずクライアントで出す
              countSlot={<FavoriteCount className={COUNT_BADGE_CLASS} />}
            />
          </li>
        </ul>
      </nav>

      <section aria-labelledby="how-to-heading">
        <h2
          id="how-to-heading"
          className="text-base font-bold text-slate-900"
        >
          使い方
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {HOW_TO_STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-900"
              >
                {index + 1}
              </span>
              <span className="pt-0.5 text-sm leading-relaxed text-slate-700">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-1 flex flex-col gap-4 border-t border-slate-200 pt-4">
        <SafetyNotice />

        {/* 管理者だけが使うリンク。目立たせないが、スマホからも入れるように置いておく。
            未ログインなら middleware がログイン画面へ回す。 */}
        <Link
          href="/admin"
          className="inline-flex min-h-[44px] items-center justify-center text-xs font-medium text-slate-400 active:text-slate-600"
        >
          管理者ログイン
        </Link>
      </footer>
    </div>
  );
}

/**
 * 入口の大きなボタン。
 * カード全体がリンクなので、狙いを定めずタップしても入れる。
 */
function MenuButton({
  href,
  icon,
  title,
  description,
  count,
  countSlot,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  /** サーバーで数えた件数。省略すると件数バッジを出さない */
  count?: number;
  /** 件数をクライアントで出す場合はこちら（お気に入り用） */
  countSlot?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition active:bg-slate-50"
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-3xl"
      >
        {icon}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-bold text-slate-900">{title}</span>
          {count !== undefined && (
            <span className={COUNT_BADGE_CLASS}>{count}種目</span>
          )}
          {countSlot}
        </span>
        <span className="text-sm leading-snug text-slate-600">
          {description}
        </span>
      </span>

      <span aria-hidden="true" className="shrink-0 text-xl text-slate-300">
        ›
      </span>
    </Link>
  );
}
