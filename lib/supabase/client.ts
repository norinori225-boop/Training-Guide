import { createBrowserClient } from '@supabase/ssr';

/**
 * ブラウザ（Client Component）用の Supabase クライアント。
 * 使うキーは anon キーのみ。service_role キーは絶対にここへ持ち込まない。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
