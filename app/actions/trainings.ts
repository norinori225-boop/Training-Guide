'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { GENRE_CODES } from '@/lib/constants';
import type { GenreCode } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import {
  GENRE_CATEGORY_MISMATCH_MESSAGE,
  trainingSchema,
  toFieldErrors,
  validateImageFile,
  type ActionResult,
  type TrainingInput,
} from '@/lib/schemas';
import {
  objectPathFromPublicUrl,
  removeObjectQuietly,
  removeTrainingFolderQuietly,
  uploadTrainingImage,
} from '@/lib/storage';

/** FormData を素のオブジェクトへ。チェックリストの空文字はここで除去する。 */
function toRawInput(formData: FormData) {
  return {
    genre: String(formData.get('genre') ?? ''),
    title: String(formData.get('title') ?? ''),
    short_description: String(formData.get('short_description') ?? ''),
    description: String(formData.get('description') ?? ''),
    intensity: String(formData.get('intensity') ?? ''),
    categoryIds: formData.getAll('categoryIds').map(String),
    equipment: formData.getAll('equipment').map(String),
    age_groups: formData.getAll('age_groups').map(String),
    people: String(formData.get('people') ?? ''),
    checklist: formData
      .getAll('checklist')
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0),
    youtube_url: String(formData.get('youtube_url') ?? ''),
  };
}

/**
 * 利用者側に即座に反映させる。
 *
 * 入口（`/`）はジャンルごとの件数を出しているので、種目を足し引きしたら
 * 一緒に作り直す必要がある。
 *
 * ジャンル別一覧は「関係したジャンル」を渡す。編集でジャンルを移した場合は
 * 変更前と変更後の両方を渡すこと（移動元の一覧にも古い内容が残るため）。
 * 判別できなかった場合は安全側に倒して全ジャンル流す。
 */
function revalidateTraining(
  trainingId: string,
  ...genres: (GenreCode | null | undefined)[]
) {
  revalidatePath('/');

  const targets = new Set(genres.filter((genre): genre is GenreCode => Boolean(genre)));
  for (const genre of targets.size > 0 ? targets : GENRE_CODES) {
    revalidatePath(`/list/${genre}`);
  }

  revalidatePath(`/training/${trainingId}`);
}

type SelectedCategory = { id: string; sort_order: number };

/**
 * 選択されたカテゴリーを読み込み、保存してよいか検証する。
 *
 * 「そのジャンルのカテゴリーだけを送ってくる」のは画面の都合でしかないので、
 * ここでサーバー側でも突き合わせる（フォームを迂回して直接 POST されても
 * ジャンル違いの組み合わせが保存されないようにする）。
 *
 * 種目の行を作る前に呼ぶこと。あとで弾くと、カテゴリーが1件も付いていない
 * 種目だけが残ってしまう。
 */
async function loadSelectedCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryIds: string[],
  genre: GenreCode,
): Promise<{ categories: SelectedCategory[] } | { error: ActionResult }> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, genre, sort_order')
    .in('id', categoryIds);

  if (error) {
    return {
      error: { ok: false, message: `カテゴリーの取得に失敗しました: ${error.message}` },
    };
  }

  const categories = data ?? [];

  if (categories.length !== categoryIds.length) {
    return {
      error: {
        ok: false,
        fieldErrors: {
          categoryIds: '選択されたカテゴリーの中に、存在しないものが含まれています。',
        },
      },
    };
  }

  if (categories.some((category) => category.genre !== genre)) {
    return {
      error: {
        ok: false,
        fieldErrors: { categoryIds: GENRE_CATEGORY_MISMATCH_MESSAGE },
      },
    };
  }

  return { categories };
}

/**
 * training_categories を入れ直す（全削除 → 再挿入で置き換える）。
 * sort_order は categories.sort_order の昇順で 0 から機械採番する。
 */
async function replaceTrainingCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainingId: string,
  categories: SelectedCategory[],
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from('training_categories')
    .delete()
    .eq('training_id', trainingId);

  if (deleteError) {
    return `カテゴリーの更新に失敗しました: ${deleteError.message}`;
  }

  const rows = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category, index) => ({
      training_id: trainingId,
      category_id: category.id,
      sort_order: index,
    }));

  const { error: insertError } = await supabase
    .from('training_categories')
    .insert(rows);

  if (insertError) {
    return `カテゴリーの登録に失敗しました: ${insertError.message}`;
  }

  return null;
}

/** trainings に書き込む列（カテゴリーと画像は別扱い） */
function toTrainingRow(input: TrainingInput) {
  return {
    genre: input.genre,
    title: input.title,
    intensity: input.intensity,
    short_description: input.short_description,
    description: input.description,
    equipment: input.equipment,
    age_groups: input.age_groups,
    people: input.people,
    checklist: input.checklist,
    youtube_url: input.youtube_url,
  };
}

/**
 * トレーニングの新規登録・更新。
 * id が空なら新規、入っていれば更新。
 */
export async function saveTrainingAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '権限がありません。',
    };
  }

  const parsed = trainingSchema.safeParse(toRawInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const trainingId = String(formData.get('id') ?? '').trim();
  const isUpdate = trainingId.length > 0;

  // 画像は保存前に形式・サイズを検証する（アップロードは行を作ってから）
  const imageFile = formData.get('image');
  const hasImage = imageFile instanceof File && imageFile.size > 0;

  if (hasImage) {
    const imageError = validateImageFile(imageFile);
    if (imageError) {
      return { ok: false, fieldErrors: { image: imageError } };
    }
  }

  const supabase = await createClient();
  const row = toTrainingRow(parsed.data);

  // ジャンルとカテゴリーの組み合わせは、行を作る前に検証する
  const selected = await loadSelectedCategories(
    supabase,
    parsed.data.categoryIds,
    parsed.data.genre,
  );
  if ('error' in selected) {
    return selected.error;
  }

  let savedId = trainingId;
  let previousThumbnailUrl: string | null = null;
  // 編集でジャンルを移したとき、移動元の一覧も作り直すために控えておく
  let previousGenre: GenreCode | null = null;

  if (isUpdate) {
    const { data: existing } = await supabase
      .from('trainings')
      .select('thumbnail_url, genre')
      .eq('id', trainingId)
      .maybeSingle();

    previousThumbnailUrl = existing?.thumbnail_url ?? null;
    previousGenre = (existing?.genre as GenreCode | undefined) ?? null;

    const { error } = await supabase
      .from('trainings')
      .update(row)
      .eq('id', trainingId);

    if (error) {
      return { ok: false, message: `保存に失敗しました: ${error.message}` };
    }
  } else {
    const { data, error } = await supabase
      .from('trainings')
      .insert(row)
      .select('id')
      .single();

    if (error || !data) {
      return {
        ok: false,
        message: `保存に失敗しました: ${error?.message ?? '原因不明のエラー'}`,
      };
    }
    savedId = data.id;
  }

  // カテゴリーの置き換え
  const categoryError = await replaceTrainingCategories(
    supabase,
    savedId,
    selected.categories,
  );
  if (categoryError) {
    return { ok: false, message: categoryError };
  }

  // 画像アップロード（行が確定してから。パスに trainingId を使うため）
  if (hasImage) {
    const uploaded = await uploadTrainingImage(supabase, savedId, imageFile);

    if ('error' in uploaded) {
      return { ok: false, fieldErrors: { image: uploaded.error } };
    }

    const { error } = await supabase
      .from('trainings')
      .update({ thumbnail_url: uploaded.publicUrl })
      .eq('id', savedId);

    if (error) {
      return {
        ok: false,
        message: `画像の保存に失敗しました: ${error.message}`,
      };
    }

    // 旧画像の削除はベストエフォート（失敗しても処理は続行する）
    await removeObjectQuietly(
      supabase,
      objectPathFromPublicUrl(previousThumbnailUrl),
    );
  }

  // 変更前と変更後の両方のジャンルの一覧を作り直す
  revalidateTraining(savedId, parsed.data.genre, previousGenre);
  redirect('/admin');
}

/** トレーニングを削除する（training_categories は cascade で消える） */
export async function deleteTrainingAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '権限がありません。',
    };
  }

  const trainingId = String(formData.get('id') ?? '').trim();
  if (!trainingId) {
    return { ok: false, message: '削除対象が指定されていません。' };
  }

  const supabase = await createClient();

  // どの一覧を作り直せばよいか、消える前に確かめておく
  const { data: existing } = await supabase
    .from('trainings')
    .select('genre')
    .eq('id', trainingId)
    .maybeSingle();

  const deletedGenre = (existing?.genre as GenreCode | undefined) ?? null;

  const { error } = await supabase
    .from('trainings')
    .delete()
    .eq('id', trainingId);

  if (error) {
    return { ok: false, message: `削除に失敗しました: ${error.message}` };
  }

  // 画像の後始末はベストエフォート
  await removeTrainingFolderQuietly(supabase, trainingId);

  revalidateTraining(trainingId, deletedGenre);
  redirect('/admin');
}
