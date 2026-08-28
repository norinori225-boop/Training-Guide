import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Metadata } from 'next';
import {
  AGE_GROUP_LABELS,
  equipmentLabels,
  GENRE_LABELS,
  PEOPLE_LABELS,
} from '@/lib/constants';
import { fetchTrainingById } from '@/lib/queries';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { BackLink } from '@/components/BackLink';
import { Checklist } from '@/components/Checklist';
import { FavoriteButton } from '@/components/FavoriteButton';
import { IntensityBadge } from '@/components/IntensityBadge';
import { SafetyNotice } from '@/components/SafetyNotice';
import { TrainingThumbnail } from '@/components/TrainingThumbnail';

// 管理画面での変更がすぐ反映されるよう、詳細も常に動的レンダリングにする。
export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * id が UUID でなければ DB に問い合わせずに 404 にする。
 *
 * generateMetadata と本体の両方から呼ばれるため cache() で包み、
 * 1リクエストにつきクエリが1回で済むようにする。
 */
const loadTraining = cache(async (id: string) => {
  if (!UUID_PATTERN.test(id)) return null;
  return fetchTrainingById(id);
});

export async function generateMetadata({
  params,
}: PageProps<'/training/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const training = await loadTraining(id);

  if (!training) return { title: 'トレーニングが見つかりません' };

  return {
    title: training.title,
    description: training.short_description,
  };
}

export default async function TrainingDetailPage({
  params,
}: PageProps<'/training/[id]'>) {
  const { id } = await params;
  const training = await loadTraining(id);

  if (!training) notFound();

  const embedUrl = getYouTubeEmbedUrl(training.youtube_url);

  // 共有リンクから直接開かれたときの戻り先。
  // この種目が属するジャンルの一覧へ送る（URL 自体は今までどおり /training/[id]）。
  const listHref = `/list/${training.genre}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
      <BackLink
        fallbackHref={listHref}
        className="inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-medium text-sky-700 active:text-sky-900"
      >
        <span aria-hidden="true">←</span> もどる
      </BackLink>

      {/* 動画があれば埋め込み、なければ一覧と同じ3段フォールバックでサムネイル */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-200">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`${training.title}の動画`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <TrainingThumbnail
            thumbnailUrl={training.thumbnail_url}
            youtubeUrl={training.youtube_url}
            title={training.title}
            sizes="(min-width: 768px) 672px, 100vw"
            priority
          />
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-snug text-slate-900">
            {training.title}
          </h1>
          <FavoriteButton trainingId={training.id} size="lg" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IntensityBadge intensity={training.intensity} size="md" />
          {/* カテゴリーは詳細では全件表示する */}
          {training.categories.map((category) => (
            <span
              key={category.id}
              className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900"
            >
              {category.name}
            </span>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
        <InfoCell icon="🎽" label="必要な道具">
          <TagList items={equipmentLabels(training)} />
        </InfoCell>
        <InfoCell icon="👦" label="対象年齢の目安">
          <TagList items={training.age_groups.map((code) => AGE_GROUP_LABELS[code])} />
        </InfoCell>
        <InfoCell icon="👥" label="推奨人数">
          {PEOPLE_LABELS[training.people]}
        </InfoCell>
      </dl>

      <section>
        <h2 className="text-base font-bold text-slate-900">やり方</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {training.description}
        </p>
      </section>

      {training.checklist.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-900">
            チェックリスト
          </h2>
          <p className="mb-2 mt-1 text-xs text-slate-500">
            タップでチェックできます（保存はされません）
          </p>
          <Checklist items={training.checklist} />
        </section>
      )}

      <SafetyNotice />

      <Link
        href={listHref}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 active:bg-slate-100"
      >
        {GENRE_LABELS[training.genre]}の一覧にもどる
      </Link>
    </div>
  );
}

/**
 * 複数の表示名を並べる。
 * 「コーン・マーカー」のように表示名自体が「・」を含むため、区切り文字で
 * つながず、1件ずつ独立したラベルとして見せる。
 */
function TagList({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

function InfoCell({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-slate-500">
        <span className="mr-1" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}
