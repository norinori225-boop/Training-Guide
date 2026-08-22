'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getYouTubeThumbnailUrl } from '@/lib/youtube';

/**
 * サムネイルの3段フォールバック。
 *
 *   1. thumbnail_url（Supabase Storage にアップロードした画像）
 *   2. YouTube 自動サムネイル（youtube_url から動画IDを抽出）
 *   3. プレースホルダー
 *
 * URL が入っていても画像が実在するとは限らない（動画が削除された・限定公開の
 * サムネが取れない等）ので、読み込みエラーでも次の段へ落ちるようにしている。
 */
export function TrainingThumbnail({
  thumbnailUrl,
  youtubeUrl,
  title,
  sizes = '(min-width: 768px) 384px, 100vw',
  priority = false,
}: {
  thumbnailUrl: string | null;
  youtubeUrl: string | null;
  title: string;
  sizes?: string;
  priority?: boolean;
}) {
  const candidates = [thumbnailUrl, getYouTubeThumbnailUrl(youtubeUrl)].filter(
    (url): url is string => Boolean(url),
  );

  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) {
    return <ThumbnailPlaceholder title={title} />;
  }

  return (
    <Image
      src={src}
      alt={`${title}のサムネイル画像`}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setIndex((current) => current + 1)}
    />
  );
}

/** 画像がまったく無いときの代替表示 */
export function ThumbnailPlaceholder({ title }: { title: string }) {
  return (
    <div
      role="img"
      aria-label={`${title}の画像はまだ登録されていません`}
      className="flex h-full w-full items-center justify-center bg-slate-200"
    >
      <svg
        viewBox="0 0 64 64"
        className="h-12 w-12 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="32" cy="14" r="7" />
        <path d="M20 54l6-16 10-6 10 8" />
        <path d="M26 38l-8-6" />
        <path d="M46 40v14" />
      </svg>
    </div>
  );
}
