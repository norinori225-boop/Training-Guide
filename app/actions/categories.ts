'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  toFieldErrors,
  type ActionResult,
} from '@/lib/schemas';

/** Postgres の unique 制約違反 */
const UNIQUE_VIOLATION = '23505';

function toSortOrder(value: FormDataEntryValue | null): number {
  const raw = String(value ?? '').trim();
  if (raw === '') return Number.NaN;
  return Number(raw);
}

/** unique 違反を、どの列で起きたかに応じた日本語メッセージにする */
function uniqueViolationErrors(message: string): Record<string, string> {
  if (message.includes('categories_slug_key')) {
    return { slug: 'そのslugは既に使われています' };
  }
  if (message.includes('categories_name_key')) {
    return { name: 'そのカテゴリー名は既に使われています' };
  }
  return { form: 'すでに同じ内容のカテゴリーが登録されています。' };
}

function revalidateCategories() {
  revalidatePath('/');
  revalidatePath('/admin/categories');
}

export async function createCategoryAction(
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

  const parsed = categoryCreateSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    sort_order: toSortOrder(formData.get('sort_order')),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('categories').insert(parsed.data);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, fieldErrors: uniqueViolationErrors(error.message) };
    }
    return { ok: false, message: `保存に失敗しました: ${error.message}` };
  }

  revalidateCategories();
  return { ok: true };
}

/** slug は URL・コード用なので更新しない（name と sort_order のみ） */
export async function updateCategoryAction(
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

  const parsed = categoryUpdateSchema.safeParse({
    id: String(formData.get('id') ?? ''),
    name: String(formData.get('name') ?? ''),
    sort_order: toSortOrder(formData.get('sort_order')),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .update(values)
    .eq('id', id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, fieldErrors: uniqueViolationErrors(error.message) };
    }
    return { ok: false, message: `保存に失敗しました: ${error.message}` };
  }

  revalidateCategories();
  return { ok: true };
}

/**
 * カテゴリーを削除する。
 * 使用中（種目が1件以上紐づく）なら削除しない。
 * DB 側も on delete restrict なので、すり抜けても外部キーで止まる。
 */
export async function deleteCategoryAction(
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

  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    return { ok: false, message: '削除対象が指定されていません。' };
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from('training_categories')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) {
    return {
      ok: false,
      message: `使用状況の確認に失敗しました: ${countError.message}`,
    };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: 'このカテゴリーを使っている種目があるため削除できません',
    };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    return { ok: false, message: `削除に失敗しました: ${error.message}` };
  }

  revalidateCategories();
  return { ok: true };
}
