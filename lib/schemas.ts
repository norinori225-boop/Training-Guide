import { z } from 'zod';
import {
  AGE_GROUP_CODES,
  EQUIPMENT_CODES,
  EQUIPMENT_EXCLUSIVE_CODE,
  EQUIPMENT_LABELS,
  EQUIPMENT_OTHER_CODE,
  GENRE_CODES,
  INTENSITY_CODES,
  MAX_EQUIPMENT_OTHER_LENGTH,
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

/** 別ジャンルのカテゴリーが混ざっていたときのメッセージ（画面とテストで共用） */
export const GENRE_CATEGORY_MISMATCH_MESSAGE =
  '選択したジャンルと異なるカテゴリーが含まれています';

/**
 * 項目ごとのルール。項目をまたぐ検査（equipment と equipment_other の整合）は
 * これを土台にした trainingSchema の側で行う。
 */
const trainingFields = z.object({
  // フォームの一番上の項目。DB 側に default が無いので必ず送る
  genre: z.enum(GENRE_CODES, { message: 'ジャンルを選んでください。' }),

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

  // 「その他」の道具名。ここでは形だけ整え（空文字は null に寄せる）、
  // equipment との整合（必須かどうか）はオブジェクト全体の superRefine で見る。
  equipment_other: z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value ? value : null)),

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

export const trainingSchema = trainingFields
  /**
   * 「その他」を選んだときだけ道具名を必須にする。
   * 1項目だけでは決められない（equipment に依存する）ので、
   * オブジェクト全体が揃ってから見る。
   */
  .superRefine((value, ctx) => {
    if (!value.equipment.includes(EQUIPMENT_OTHER_CODE)) return;

    if (value.equipment_other === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['equipment_other'],
        message: 'その他の道具の名前を入力してください',
      });
      return;
    }

    if (value.equipment_other.length > MAX_EQUIPMENT_OTHER_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['equipment_other'],
        message: `${MAX_EQUIPMENT_OTHER_LENGTH}文字以内で入力してください`,
      });
    }
  })
  /**
   * 「その他」のチェックを外したら道具名は捨てる。
   * 画面側でも入力欄を消したときにクリアしているが、直接 POST された場合や
   * 「道具なし」で他が外れた場合もここで確実に null になる
   * （DB の CHECK 制約 trainings_equipment_other_consistent と一致させる）。
   */
  .transform((value) => ({
    ...value,
    equipment_other: value.equipment.includes(EQUIPMENT_OTHER_CODE)
      ? value.equipment_other
      : null,
  }));

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
  // どのジャンルのカテゴリーとして登録するか。タブの選択が hidden で送られる
  genre: z.enum(GENRE_CODES, { message: 'ジャンルを選んでください。' }),
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

/** slug は URL・コード用、genre は所属の付け替えになるため、どちらも編集させない */
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
