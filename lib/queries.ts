import { getPublicClient } from '@/lib/supabase/public';
import type { Category, GenreCode, Training, TrainingWithJoin } from '@/lib/types';

/**
 * このファイルの読み取りはすべて Cookie を持たない公開クライアント
 * （lib/supabase/public.ts）を使う。ここで読むデータは RLS で anon に
 * 開放されていて誰が見ても同じ内容なので、ログインセッションは要らない。
 * セッション付きクライアント（lib/supabase/server.ts）は書き込み
 * （app/actions/*）と認証（lib/auth.ts）専用。理由は public.ts のコメント参照。
 */

/** MVP の想定件数。ページネーションは作らない（100件到達時に将来対応）。 */
const TRAINING_FETCH_LIMIT = 100;

/**
 * 一覧で使う 1 クエリ。
 * カテゴリーは join でまとめて取得し、種目ごとに問い合わせない（N+1 にしない）。
 */
const TRAINING_SELECT =
  '*, training_categories(sort_order, categories(id, genre, name, slug, sort_order))';

/**
 * ネストした training_categories を、categories.sort_order 昇順の配列へ平坦化する。
 */
function flatten(row: TrainingWithJoin): Training {
  const { training_categories, ...rest } = row;

  const categories = (training_categories ?? [])
    .map((tc) => tc.categories)
    .filter((c): c is Category => c !== null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return { ...rest, categories };
}

/**
 * 一覧用: トレーニングを1クエリで取得する。
 * genre を渡すとそのジャンルだけ、省略すると全ジャンルを返す（管理画面用）。
 */
export async function fetchTrainings(genre?: GenreCode): Promise<Training[]> {
  const supabase = getPublicClient();

  let request = supabase
    .from('trainings')
    .select(TRAINING_SELECT)
    .order('created_at', { ascending: false })
    .limit(TRAINING_FETCH_LIMIT);

  if (genre) request = request.eq('genre', genre);

  const { data, error } = await request;

  if (error) {
    throw new Error(`トレーニングの取得に失敗しました: ${error.message}`);
  }

  return ((data ?? []) as unknown as TrainingWithJoin[]).map(flatten);
}

/** 詳細用: id 指定で1件取得する。見つからなければ null */
export async function fetchTrainingById(id: string): Promise<Training | null> {
  const supabase = getPublicClient();

  const { data, error } = await supabase
    .from('trainings')
    .select(TRAINING_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`トレーニングの取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  return flatten(data as unknown as TrainingWithJoin);
}

/**
 * 絞り込みチップ用: カテゴリーマスタを sort_order 昇順で取得する。
 * genre を渡すとそのジャンルのカテゴリーだけ、省略すると全件返す（管理画面用）。
 */
export async function fetchCategories(genre?: GenreCode): Promise<Category[]> {
  const supabase = getPublicClient();

  let request = supabase
    .from('categories')
    .select('id, genre, name, slug, sort_order')
    .order('sort_order', { ascending: true });

  if (genre) request = request.eq('genre', genre);

  const { data, error } = await request;

  if (error) {
    throw new Error(`カテゴリーの取得に失敗しました: ${error.message}`);
  }

  return (data ?? []) as Category[];
}

/**
 * 入口画面のバッジ用: ジャンルごとの登録件数だけを数える。
 *
 * head: true なので行は1件も返さず、Postgres の count だけを受け取る。
 * 入口では件数しか使わないため、種目本体を取ってきて length を数えない。
 */
export async function fetchTrainingCount(genre: GenreCode): Promise<number> {
  const supabase = getPublicClient();

  const { count, error } = await supabase
    .from('trainings')
    .select('id', { count: 'exact', head: true })
    .eq('genre', genre);

  if (error) {
    // head: true はレスポンス本文が無いので、PostgREST がエラーを返しても
    // message が空文字で届くことがある（例: 列が無い・RLS で弾かれた）。
    // 「失敗しました: 」だけの無情報なエラーにならないよう補足を足す。
    const detail =
      [error.message, error.code].filter(Boolean).join(' / ') ||
      '詳細不明（件数のみのリクエストなのでエラー本文が返りません）';
    throw new Error(`トレーニング件数の取得に失敗しました: ${detail}`);
  }

  return count ?? 0;
}

/**
 * 入口画面用: ジャンルごとの件数をまとめて数える。**この関数は例外を投げない。**
 *
 * 件数はボタンに添える飾りのバッジなので、これが取れないことと
 * 「画面を出せない」ことは別。1ジャンルの数え上げが失敗しただけで
 * Promise.all が reject して入口ごと落ちる（＝「画面を読み込めませんでした」）
 * のを避けるため、allSettled で受けて、失敗したジャンルだけ null にする。
 * 呼び出し側は null のときバッジを出さない。
 */
export async function fetchTrainingCounts(
  genres: readonly GenreCode[],
): Promise<(number | null)[]> {
  const results = await Promise.allSettled(
    genres.map((genre) => fetchTrainingCount(genre)),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;

    // 画面には出さないが、原因を追えるようサーバーログには必ず残す
    // （Vercel の Runtime Logs で拾える）。
    console.error(
      `[fetchTrainingCounts] ${genres[index]} の件数取得に失敗したのでバッジを省略します`,
      result.reason,
    );
    return null;
  });
}

/**
 * 詳細ページをビルド時に作っておくための id 一覧（app/training/[id] 用）。
 * 本文は要らないので id だけ取る。
 */
export async function fetchTrainingIds(): Promise<string[]> {
  const supabase = getPublicClient();

  const { data, error } = await supabase
    .from('trainings')
    .select('id')
    .limit(TRAINING_FETCH_LIMIT);

  if (error) {
    throw new Error(`トレーニングIDの取得に失敗しました: ${error.message}`);
  }

  return ((data ?? []) as { id: string }[]).map((row) => row.id);
}

/* ------------------------------------------------------------------ */
/* 管理画面用                                                          */
/* ------------------------------------------------------------------ */

/**
 * 管理一覧用: 更新日の新しい順で取得する。
 * genre を渡すとそのジャンルだけ、省略すると全ジャンル（＝「すべて」タブ）。
 */
export async function fetchTrainingsForAdmin(
  genre?: GenreCode,
): Promise<Training[]> {
  const supabase = getPublicClient();

  let request = supabase
    .from('trainings')
    .select(TRAINING_SELECT)
    .order('updated_at', { ascending: false })
    .limit(TRAINING_FETCH_LIMIT);

  if (genre) request = request.eq('genre', genre);

  const { data, error } = await request;

  if (error) {
    throw new Error(`トレーニングの取得に失敗しました: ${error.message}`);
  }

  return ((data ?? []) as unknown as TrainingWithJoin[]).map(flatten);
}

export type CategoryWithUsage = Category & {
  /** このカテゴリーを使っている種目数。1件以上なら削除できない */
  usageCount: number;
};

/**
 * カテゴリー管理用: 使用中の種目数つきで取得する（1クエリ）。
 * genre を渡すとそのジャンルのカテゴリーだけ返す。
 */
export async function fetchCategoriesWithUsage(
  genre?: GenreCode,
): Promise<CategoryWithUsage[]> {
  const supabase = getPublicClient();

  let request = supabase
    .from('categories')
    .select('id, genre, name, slug, sort_order, training_categories(count)')
    .order('sort_order', { ascending: true });

  if (genre) request = request.eq('genre', genre);

  const { data, error } = await request;

  if (error) {
    throw new Error(`カテゴリーの取得に失敗しました: ${error.message}`);
  }

  type Row = Category & { training_categories: { count: number }[] | null };

  return ((data ?? []) as unknown as Row[]).map(({ training_categories, ...category }) => ({
    ...category,
    usageCount: training_categories?.[0]?.count ?? 0,
  }));
}
