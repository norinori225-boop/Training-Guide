import { z } from 'zod';
import {
  AGE_GROUP_CODES,
  EQUIPMENT_CODES,
  EQUIPMENT_EXCLUSIVE_CODE,
  EQUIPMENT_LABELS,
  INTENSITY_CODES,
  PEOPLE_CODES,
} from '@/lib/constants';
import { isValidYouTubeUrl } from '@/lib/youtube';

/**
 * 入力バリデーションの唯一の置き場所。
 * クライアント（フォーム）と Server Action の両方がここを import して共用する。
 * 選択肢のコード値は lib/constants.ts から取るので、ここにも直書きしない。
 */

export const MAX_CHECKLIST_ITEMS = 20;
export const MAX_CHECKLIST_ITEM_LENGTH = 60;

/* ---------------- 画像アップロード ---------------- */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** 拡張子は MIME から決める（ユーザーのファイル名は信用しない） */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return 'JPEG・PNG・WebP のいずれかの画像を選んでください。';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return '画像のサイズは5MBまでです。もっと小さい画像を選んでください。';
  }
  return null;
}

/* ---------------- トレーニング ---------------- */

export const trainingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'タイトルを入力してください。')
    .max(60, 'タイトルは60文字以内で入力してください。'),

  short_description: z
    .string()
    .trim()
    .min(1, '簡単な説明を入力してください。')
    .max(120, '簡単な説明は120文字以内で入力してください。'),

  description: z
    .string()
    .trim()
    .min(1, '詳しい説明を入力してください。')
    .max(2000, '詳しい説明は2000文字以内で入力してください。'),

  intensity: z.enum(INTENSITY_CODES, { message: '強度を選んでください。' }),

  categoryIds: z
    .array(z.uuid('カテゴリーの指定が正しくありません。'))
    .min(1, 'カテゴリーを1つ以上選んでください。'),

  equipment: z
    .array(z.enum(EQUIPMENT_CODES, { message: '必要な道具の指定が正しくありません。' }))
    .min(1, '必要な道具を1つ以上選んでください。')
    .refine(
      (codes) =>
        !codes.includes(EQUIPMENT_EXCLUSIVE_CODE) || codes.length === 1,
      `「${EQUIPMENT_LABELS[EQUIPMENT_EXCLUSIVE_CODE]}」は他の道具と同時に選べません。`,
    ),

  age_groups: z
    .array(z.enum(AGE_GROUP_CODES, { message: '対象年齢の指定が正しくありません。' }))
    .min(1, '対象年齢の目安を1つ以上選んでください。'),

  people: z.enum(PEOPLE_CODES, { message: '推奨人数を選んでください。' }),

  // 空文字は FormData → オブジェクト変換の時点で除去済み
  checklist: z
    .array(
      z
        .string()
        .trim()
        .max(
          MAX_CHECKLIST_ITEM_LENGTH,
          `チェックリストの項目は${MAX_CHECKLIST_ITEM_LENGTH}文字以内で入力してください。`,
        ),
    )
    .max(
      MAX_CHECKLIST_ITEMS,
      `チェックリストは${MAX_CHECKLIST_ITEMS}件までです。`,
    ),

  youtube_url: z
    .string()
    .trim()
    .nullable()
    .refine(
      (value) => value === null || value === '' || isValidYouTubeUrl(value),
      'YouTubeのURLの形式が正しくありません',
    )
    .transform((value) => (value ? value : null)),
});

export type TrainingInput = z.infer<typeof trainingSchema>;

/* ---------------- カテゴリー ---------------- */

const categoryName = z
  .string()
  .trim()
  .min(1, 'カテゴリー名を入力してください。')
  .max(30, 'カテゴリー名は30文字以内で入力してください。');

const categorySortOrder = z
  .number({ message: '表示順は数値で入力してください。' })
  .int('表示順は整数で入力してください。')
  .min(0, '表示順は0以上で入力してください。')
  .max(9999, '表示順は9999以下で入力してください。');

export const categoryCreateSchema = z.object({
  name: categoryName,
  slug: z
    .string()
    .trim()
    .min(1, 'slugを入力してください。')
    .max(40, 'slugは40文字以内で入力してください。')
    .regex(
      /^[a-z0-9-]+$/,
      'slugは半角の英小文字・数字・ハイフンだけで入力してください。',
    ),
  sort_order: categorySortOrder,
});

/** slug は URL・コード用なので編集させない */
export const categoryUpdateSchema = z.object({
  id: z.uuid('カテゴリーの指定が正しくありません。'),
  name: categoryName,
  sort_order: categorySortOrder,
});

/* ---------------- Server Action の戻り値 ---------------- */

export type ActionResult = {
  ok: boolean;
  /** 項目ごとのエラー。キーはフォームの name */
  fieldErrors?: Record<string, string>;
  /** 項目に紐づかない全体エラー */
  message?: string;
};

/** ZodError を fieldErrors（1項目1メッセージ）に変換する */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    // 最初のエラーだけ拾う（1項目に複数出さない）
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}
