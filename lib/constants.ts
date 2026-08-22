/**
 * アプリ内で使う「選択肢」の唯一の定義場所。
 *
 * ルール:
 * - 強度・道具・対象年齢・推奨人数の表示名は、このファイル以外にハードコードしない。
 * - 画面・スキーマ・検索処理はすべてこのファイルを import して使う。
 * - コード値（low, ladder など）は DB に保存する値。表示名（弱, ラダー など）は画面に出す値。
 *
 * 各グループが持つもの:
 * - `X_CODES`   … コード値の配列（DB の CHECK 制約と一致させること）
 * - `X_LABELS`  … コード値 → 表示名のマップ
 * - `X_OPTIONS` … フォームで並べる用の { code, label } 配列
 * - `xCodesByKeyword()` … 表示名 → コード値の逆引き（キーワード検索用）
 */

/** 検索・逆引き用の正規化（前後の空白除去＋小文字化） */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 表示名 → コード値の逆引きを作る。
 * 表示名に検索語が部分一致したコード値をすべて返す。
 * 例:「ラダー」→ ['ladder']、「コーン」→ ['cone']（表示名は「コーン・マーカー」）
 */
function createKeywordLookup<T extends string>(
  codes: readonly T[],
  labels: Record<T, string>,
) {
  return (keyword: string): T[] => {
    const needle = normalize(keyword);
    if (!needle) return [];
    return codes.filter((code) => normalize(labels[code]).includes(needle));
  };
}

/* ------------------------------------------------------------------ */
/* 強度 INTENSITY                                                      */
/* ------------------------------------------------------------------ */

export const INTENSITY_CODES = ['low', 'mid', 'high'] as const;
export type IntensityCode = (typeof INTENSITY_CODES)[number];

export const INTENSITY_LABELS: Record<IntensityCode, string> = {
  low: '弱',
  mid: '中',
  high: '強',
};

/**
 * 強度バッジの配色（弱=緑 / 中=黄 / 強=赤）。
 * ⚠️ 色だけで区別させないこと。バッジには必ず INTENSITY_LABELS の文字を併記する。
 */
export const INTENSITY_BADGE_CLASSES: Record<IntensityCode, string> = {
  low: 'bg-green-100 text-green-900 border-green-400',
  mid: 'bg-yellow-100 text-yellow-900 border-yellow-500',
  high: 'bg-red-100 text-red-900 border-red-400',
};

export const INTENSITY_OPTIONS = INTENSITY_CODES.map((code) => ({
  code,
  label: INTENSITY_LABELS[code],
}));

/** 検索語に部分一致する強度コードをすべて返す */
export const intensityCodesByKeyword = createKeywordLookup(
  INTENSITY_CODES,
  INTENSITY_LABELS,
);

/* ------------------------------------------------------------------ */
/* 道具 EQUIPMENT                                                      */
/* ------------------------------------------------------------------ */

export const EQUIPMENT_CODES = [
  'none',
  'ladder',
  'cone',
  'ball',
  'other',
] as const;
export type EquipmentCode = (typeof EQUIPMENT_CODES)[number];

export const EQUIPMENT_LABELS: Record<EquipmentCode, string> = {
  none: '道具なし',
  ladder: 'ラダー',
  cone: 'コーン・マーカー',
  ball: 'ボール',
  other: 'その他',
};

/** 「道具なし」は他の道具と同時に選べない排他コード */
export const EQUIPMENT_EXCLUSIVE_CODE: EquipmentCode = 'none';

export const EQUIPMENT_OPTIONS = EQUIPMENT_CODES.map((code) => ({
  code,
  label: EQUIPMENT_LABELS[code],
}));

/**
 * 検索語に部分一致する道具コードをすべて返す。
 * DB には equipment がコード値で入っているため、キーワード検索では
 * 「ラダー」→ ladder のように変換してから突き合わせる。
 */
export const equipmentCodesByKeyword = createKeywordLookup(
  EQUIPMENT_CODES,
  EQUIPMENT_LABELS,
);

/* ------------------------------------------------------------------ */
/* 対象年齢 AGE_GROUPS                                                 */
/* ------------------------------------------------------------------ */

export const AGE_GROUP_CODES = ['preschool', 'lower', 'upper'] as const;
export type AgeGroupCode = (typeof AGE_GROUP_CODES)[number];

export const AGE_GROUP_LABELS: Record<AgeGroupCode, string> = {
  preschool: '幼児',
  lower: '小学校低学年',
  upper: '小学校高学年',
};

export const AGE_GROUP_OPTIONS = AGE_GROUP_CODES.map((code) => ({
  code,
  label: AGE_GROUP_LABELS[code],
}));

/** 検索語に部分一致する対象年齢コードをすべて返す */
export const ageGroupCodesByKeyword = createKeywordLookup(
  AGE_GROUP_CODES,
  AGE_GROUP_LABELS,
);

/* ------------------------------------------------------------------ */
/* 推奨人数 PEOPLE                                                     */
/* ------------------------------------------------------------------ */

export const PEOPLE_CODES = ['solo', 'pair', 'group'] as const;
export type PeopleCode = (typeof PEOPLE_CODES)[number];

export const PEOPLE_LABELS: Record<PeopleCode, string> = {
  solo: '1人でできる',
  pair: '2人',
  group: '3人以上',
};

export const PEOPLE_OPTIONS = PEOPLE_CODES.map((code) => ({
  code,
  label: PEOPLE_LABELS[code],
}));

/** 検索語に部分一致する推奨人数コードをすべて返す */
export const peopleCodesByKeyword = createKeywordLookup(
  PEOPLE_CODES,
  PEOPLE_LABELS,
);

/* ------------------------------------------------------------------ */
/* その他の共通定数                                                     */
/* ------------------------------------------------------------------ */

/** 安全に関する注意書き（一覧フッターと詳細ページで共用） */
export const SAFETY_NOTICE =
  '無理せず、大人の見守りのもとで行ってください。体調が悪いときは中止してください。';

/** 画像を保存する Supabase Storage のバケット名 */
export const STORAGE_BUCKET = 'training-images';
