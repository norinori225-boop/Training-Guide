/**
 * アプリ全体で使う型。
 * 選択肢のコード値は lib/constants.ts が唯一の定義元なので、ここでは再エクスポートするだけ。
 */
import type {
  IntensityCode,
  EquipmentCode,
  AgeGroupCode,
  PeopleCode,
} from '@/lib/constants';

export type {
  IntensityCode,
  EquipmentCode,
  AgeGroupCode,
  PeopleCode,
};

/** categories テーブル */
export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

/** trainings テーブル（DB から返ってくる素の形） */
export type TrainingRow = {
  id: string;
  title: string;
  intensity: IntensityCode;
  short_description: string;
  description: string;
  equipment: EquipmentCode[];
  age_groups: AgeGroupCode[];
  people: PeopleCode;
  checklist: string[];
  youtube_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

/** 多対多の中間テーブルをネストしたまま受け取る形 */
export type TrainingWithJoin = TrainingRow & {
  training_categories: {
    sort_order: number;
    categories: Category | null;
  }[];
};

/**
 * 画面で扱いやすいように、カテゴリーを配列へ平坦化したもの。
 * categories は必ず categories.sort_order の昇順に並んでいる。
 */
export type Training = TrainingRow & {
  categories: Category[];
};
