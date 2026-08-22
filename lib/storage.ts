import type { SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKET } from '@/lib/constants';
import { IMAGE_EXTENSIONS } from '@/lib/schemas';

/**
 * サムネイル画像の保存・削除。
 *
 * 書き込みはログインセッション経由で行うため、Storage 側の RLS
 * （bucket_id = 'training-images' and public.is_admin()）を実際に通る。
 */

/** 公開URLから、バケット内のオブジェクトパスを逆算する */
export function objectPathFromPublicUrl(publicUrl: string | null): string | null {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;

  const path = publicUrl.slice(index + marker.length);
  return path ? decodeURIComponent(path) : null;
}

/**
 * 画像をアップロードして公開URLを返す。
 * 保存パスは `${trainingId}/${uuid}.${ext}`。
 */
export async function uploadTrainingImage(
  supabase: SupabaseClient,
  trainingId: string,
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return { error: 'JPEG・PNG・WebP のいずれかの画像を選んでください。' };
  }

  const path = `${trainingId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { error: `画像のアップロードに失敗しました: ${error.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return { publicUrl };
}

/**
 * 旧画像を削除する。ベストエフォートなので、失敗しても例外を投げない。
 * （孤立ファイルの完全なGCは作らない方針）
 */
export async function removeObjectQuietly(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path) return;

  try {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  } catch {
    // 握りつぶす（孤立ファイルが残っても処理は続行する）
  }
}

/** トレーニング削除時に、そのトレーニング配下の画像をまとめて消す（ベストエフォート） */
export async function removeTrainingFolderQuietly(
  supabase: SupabaseClient,
  trainingId: string,
): Promise<void> {
  try {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(trainingId);

    if (!data?.length) return;

    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(data.map((item) => `${trainingId}/${item.name}`));
  } catch {
    // 握りつぶす
  }
}
