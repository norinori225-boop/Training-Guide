import { createClient } from '@supabase/supabase-js';

/**
 * 公開ページの読み取り専用 Supabase クライアント（Cookie を持たない）。
 *
 * ■ なぜ lib/supabase/server.ts と分けるのか
 * server.ts のクライアントは Cookie（＝管理者のログインセッション）を持ち込む。
 * supabase-js は PostgREST へ問い合わせる前に必ず auth.getSession() を呼ぶため、
 * 一度でも /admin にログインした端末では、公開ページを開くたびに
 *   1. アクセストークンの期限切れ判定
 *   2. 期限切れならリフレッシュのため Supabase へもう1往復
 * が走る。しかも Server Component からは更新後の Cookie を書き戻せず
 * （server.ts の catch を参照）、middleware は /admin にしか効かないので、
 * 同じリフレッシュトークンが延々と使い回されて最終的に 401 になる。
 * これが「画面を読み込めませんでした」が通信正常時にも出ていた原因。
 *
 * ■ セッション無しで良い理由
 * このアプリが画面に出すデータ（trainings / categories / training_categories）は
 * RLS で anon に開放されている（*_select_public ポリシー。migrations 参照）。
 * 誰が見ても同じ内容なので、読み取りにログインセッションは要らない。
 * Cookie を渡さないことで上の往復と失敗要因をまるごと無くす。
 *
 * ⚠️ 将来「ログインした人にしか見せない行」を RLS で作ったら、
 * その読み取りだけは server.ts のクライアントに戻すこと。
 * 書き込み（app/actions/*）と認証（lib/auth.ts）は今まで通り server.ts を使う。
 */

/**
 * PostgREST が応答しないときに、いつまでも待たずに諦める時間。
 * ここで打ち切れば、遅いだけのリクエストが画面全体を巻き込んで
 * プラットフォーム側のタイムアウトまで固まるのを防げる。
 */
const QUERY_TIMEOUT_MS = 8_000;

/**
 * セッションを持たない＝リクエストごとに変わる状態が無いので、
 * 1つ作って使い回してよい（接続や fetch の準備を毎回やり直さずに済む）。
 */
let cached: ReturnType<typeof createClient> | null = null;

export function getPublicClient() {
  if (cached) return cached;

  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Cookie も localStorage も使わず、常に anon キーのまま問い合わせる。
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: {
        timeout: QUERY_TIMEOUT_MS,
      },
    },
  );

  return cached;
}
