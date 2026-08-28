/**
 * アプリ内で使う「選択肢」の唯一の定義場所。
 *
 * ルール:
 * - ジャンル・強度・道具・対象年齢・推奨人数の表示名は、このファイル以外にハードコードしない。
 * - 画面・スキーマ・検索処理はすべてこのファイルを import して使う。
 * - コード値（low, ladder など）は DB に保存する値。表示名（弱, ラダー など）は画面に出す値。
 *
 * 各グループが持つもの:
 * - `X_CODES`   … コード値の配列（DB の CHECK 制約と一致させること）
 * - `X_LABELS`  … コード値 → 表示名のマップ
 * - `X_SHORT_LABELS` … コード値 → 短縮表示名のマップ（狭い場所用。ジャンルのみ）
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
/* ジャンル GENRE                                                      */
/* ------------------------------------------------------------------ */

/**
 * トレーニング全体を分ける最上位の軸。
 * カテゴリー（categories テーブル）より1段上で、コードで固定する。
 * 管理画面からの追加・削除はできない。
 *
 * ジャンルを増やすときに直す場所（README「ジャンルを増やすには」も参照）:
 *   1. この GENRE_CODES にコード値を足す
 *   2. 下の GENRE_LABELS / GENRE_SHORT_LABELS / GENRE_ICONS /
 *      GENRE_DESCRIPTIONS を埋める（Record 型なので埋め忘れると型エラーになる）
 *   3. DB の CHECK 制約 trainings_genre_valid / categories_genre_valid を直す
 *   4. そのジャンルのカテゴリーを1件以上登録する（0件だと種目を登録できない）
 * 画面側（入口のボタン・タブ・一覧）はこの配列から作るので、追加の改修は不要。
 */
export const GENRE_CODES = ['body-play', 'lifting'] as const;
export type GenreCode = (typeof GENRE_CODES)[number];

/** 見出しなど、広さに余裕がある場所で使う正式な表示名 */
export const GENRE_LABELS: Record<GenreCode, string> = {
  'body-play': '体遊びトレーニング',
  lifting: 'リフティングトレーニング',
};

/** タブ・バッジなど、幅が狭い場所で使う短縮表示名 */
export const GENRE_SHORT_LABELS: Record<GenreCode, string> = {
  'body-play': '体遊び',
  lifting: 'リフティング',
};

/** 入口画面のボタンに出すアイコン */
export const GENRE_ICONS: Record<GenreCode, string> = {
  'body-play': '🤸',
  lifting: '⚽',
};

/** 入口画面のボタンに出す1行説明 */
export const GENRE_DESCRIPTIONS: Record<GenreCode, string> = {
  'body-play': '走る・跳ぶ・バランスをとる。体を使った基本の練習',
  lifting: 'トラップやコントロール。ボールにさわる練習',
};

export const GENRE_OPTIONS = GENRE_CODES.map((code) => ({
  code,
  label: GENRE_LABELS[code],
  shortLabel: GENRE_SHORT_LABELS[code],
  icon: GENRE_ICONS[code],
  description: GENRE_DESCRIPTIONS[code],
}));

/** 未知の文字列（URL のパラメータなど）がジャンルのコード値かどうかを判定する */
export function isGenreCode(value: string): value is GenreCode {
  return (GENRE_CODES as readonly string[]).includes(value);
}

/**
 * 既定のジャンル。
 * ジャンル追加前に登録された種目・カテゴリーはすべてこの値へ寄せてある
 * （マイグレーション 20260826090000_add_genre.sql の backfill と一致させること）。
 */
export const DEFAULT_GENRE: GenreCode = 'body-play';

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

/** これを選んだときだけ、道具名を自由入力できる（trainings.equipment_other） */
export const EQUIPMENT_OTHER_CODE: EquipmentCode = 'other';

/** 自由入力できる道具名の文字数上限（DB の CHECK 制約と一致させること） */
export const MAX_EQUIPMENT_OTHER_LENGTH = 30;

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

/**
 * 道具の表示名を作る唯一の関数。一覧カードも詳細ページもこれを使う。
 *
 * 'other' だけは「その他」ではなく、管理画面で入力された道具名
 * （equipment_other）を出す。表示名を出す場所が増えてもここだけ直せば済むよう、
 * EQUIPMENT_LABELS を画面から直接引かないこと。
 *
 * equipment_other が空の場合は「その他」に戻す。DB の CHECK 制約
 * （trainings_equipment_other_consistent）があるので通常は起きないが、
 * 表示が消えるより「その他」と出たほうがまし。
 */
export function equipmentLabels(training: {
  equipment: readonly EquipmentCode[];
  equipment_other: string | null;
}): string[] {
  return training.equipment.map((code) => {
    if (code !== EQUIPMENT_OTHER_CODE) return EQUIPMENT_LABELS[code];
    return training.equipment_other?.trim() || EQUIPMENT_LABELS[code];
  });
}

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
