import type { NextConfig } from "next";

/**
 * next/image で外部ホストの画像を扱うため remotePatterns を登録する。
 * - img.youtube.com : YouTube 自動サムネイル（3段フォールバックの2段目）
 * - *.supabase.co   : Supabase Storage にアップロードしたサムネイル（1段目）
 */
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Action のリクエスト本文は既定で 1MB までなので、
      // サムネイル画像の上限 5MB（lib/schemas.ts の MAX_IMAGE_BYTES）に合わせて広げる。
      // multipart/form-data の境界・ヘッダ分の余裕を少し足して 6MB にしている。
      bodySizeLimit: '6mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
