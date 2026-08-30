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
  /**
   * サービスワーカー（public/sw.js）だけは、必ず最新のものが取られるようにする。
   * ここが普通にキャッシュされると、直したはずの sw.js が古いまま居座って
   * 「キャッシュを消せない」状態になる。
   */
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            // sw.js 自身が実行できることを同一オリジンに限る。
            // 外部サイトへ取りに行く処理を sw.js に足すときは、ここも見直すこと。
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
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
