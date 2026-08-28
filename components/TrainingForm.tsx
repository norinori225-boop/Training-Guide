'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  AGE_GROUP_OPTIONS,
  DEFAULT_GENRE,
  EQUIPMENT_EXCLUSIVE_CODE,
  EQUIPMENT_LABELS,
  EQUIPMENT_OPTIONS,
  GENRE_OPTIONS,
  INTENSITY_OPTIONS,
  PEOPLE_OPTIONS,
} from '@/lib/constants';
import type {
  AgeGroupCode,
  Category,
  EquipmentCode,
  GenreCode,
  Training,
} from '@/lib/types';
import { ACCEPTED_IMAGE_TYPES, type ActionResult } from '@/lib/schemas';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { saveTrainingAction } from '@/app/actions/trainings';
import { ChecklistEditor } from '@/components/ChecklistEditor';
import {
  ErrorSummary,
  FieldError,
  FieldLabel,
  inputClass,
} from '@/components/FormField';

const INITIAL_STATE: ActionResult = { ok: true };

const requiredBadge = (
  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
    必須
  </span>
);

const legendClass =
  'flex items-center gap-2 text-sm font-bold text-slate-800';

const optionClass =
  'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3';

/**
 * 新規登録と編集で共用するフォーム。
 *
 * categories には全ジャンルのカテゴリーを渡すこと。
 * ジャンルタブを切り替えたときに、サーバーへ取りに行かずその場で
 * 選択肢を差し替えられるようにするため。
 */
export function TrainingForm({
  categories,
  training,
  initialGenre,
}: {
  /** 全ジャンルぶん。表示は選択中のジャンルで絞り込む */
  categories: Category[];
  training?: Training;
  /** 新規登録で、管理一覧の絞り込みジャンルを引き継ぎたいときに渡す */
  initialGenre?: GenreCode;
}) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    saveTrainingAction,
    INITIAL_STATE,
  );

  const [genre, setGenre] = useState<GenreCode>(
    training?.genre ?? initialGenre ?? DEFAULT_GENRE,
  );

  // カテゴリーはジャンル切り替えでクリアするので、非制御ではなく状態で持つ
  const [categoryIds, setCategoryIds] = useState<string[]>(
    training?.categories.map((category) => category.id) ?? [],
  );

  const [equipment, setEquipment] = useState<EquipmentCode[]>(
    training?.equipment ?? [],
  );
  const [ageGroups, setAgeGroups] = useState<AgeGroupCode[]>(
    training?.age_groups ?? [],
  );
  const [checklist, setChecklist] = useState<string[]>(
    training?.checklist ?? [],
  );
  const [youtubeUrl, setYoutubeUrl] = useState(training?.youtube_url ?? '');

  const errors = state.fieldErrors ?? {};
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  /** 「道具なし」は排他。選ぶと他が外れ、他を選ぶと「道具なし」が外れる。 */
  const toggleEquipment = (code: EquipmentCode) => {
    setEquipment((current) => {
      if (code === EQUIPMENT_EXCLUSIVE_CODE) {
        return current.includes(code) ? [] : [code];
      }

      const withoutExclusive = current.filter(
        (value) => value !== EQUIPMENT_EXCLUSIVE_CODE,
      );

      return withoutExclusive.includes(code)
        ? withoutExclusive.filter((value) => value !== code)
        : [...withoutExclusive, code];
    });
  };

  // 表示するのは選択中のジャンルのカテゴリーだけ
  const visibleCategories = categories.filter(
    (category) => category.genre === genre,
  );

  /**
   * ジャンルを切り替える。
   * カテゴリーはジャンルに紐づくので、選び直しになることを先に伝えてから消す。
   */
  const changeGenre = (next: GenreCode) => {
    if (next === genre) return;

    if (categoryIds.length > 0) {
      const ok = window.confirm('カテゴリーの選択が外れます。よろしいですか？');
      if (!ok) return;
    }

    setGenre(next);
    setCategoryIds([]);
  };

  const toggleCategory = (id: string) => {
    setCategoryIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const toggleAgeGroup = (code: AgeGroupCode) => {
    setAgeGroups((current) =>
      current.includes(code)
        ? current.filter((value) => value !== code)
        : [...current, code],
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {training && <input type="hidden" name="id" value={training.id} />}

      <ErrorSummary message={state.message} fieldErrors={state.fieldErrors} />

      <fieldset>
        <legend className={legendClass}>ジャンル{requiredBadge}</legend>
        <p className="mt-1 text-xs text-slate-500">
          切り替えると、下のカテゴリーの選択肢が入れ替わります。
        </p>
        <div className="mt-2 flex gap-2">
          {GENRE_OPTIONS.map((option) => (
            <label
              key={option.code}
              className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-sm font-bold transition ${
                genre === option.code
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 active:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="genre"
                value={option.code}
                checked={genre === option.code}
                onChange={() => changeGenre(option.code)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        <FieldError message={errors.genre} />
      </fieldset>

      <div>
        <FieldLabel htmlFor="title" required>
          タイトル
        </FieldLabel>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={60}
          defaultValue={training?.title ?? ''}
          className={`mt-1 ${inputClass}`}
        />
        <FieldError message={errors.title} />
      </div>

      <fieldset>
        <legend className={legendClass}>カテゴリー{requiredBadge}</legend>

        {visibleCategories.length === 0 ? (
          // このジャンルにカテゴリーが無いと、種目は1件も登録できない
          <div className="mt-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-4 text-center">
            <p className="text-sm text-amber-900">
              このジャンルにはカテゴリーがまだありません。
              <br />
              先にカテゴリーを登録してください。
            </p>
            <Link
              href={`/admin/categories?genre=${genre}`}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full border border-amber-500 bg-white px-5 text-sm font-bold text-amber-900 active:bg-amber-100"
            >
              カテゴリー管理をひらく
            </Link>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {visibleCategories.map((category) => (
              <label key={category.id} className={optionClass}>
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  className="h-5 w-5 accent-sky-600"
                />
                <span className="text-sm text-slate-800">{category.name}</span>
              </label>
            ))}
          </div>
        )}

        <FieldError message={errors.categoryIds} />
      </fieldset>

      <fieldset>
        <legend className={legendClass}>強度{requiredBadge}</legend>
        <div className="mt-2 flex gap-2">
          {INTENSITY_OPTIONS.map((option) => (
            <label
              key={option.code}
              className={`${optionClass} flex-1 justify-center`}
            >
              <input
                type="radio"
                name="intensity"
                value={option.code}
                defaultChecked={training?.intensity === option.code}
                className="h-5 w-5 accent-sky-600"
              />
              <span className="text-sm text-slate-800">{option.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.intensity} />
      </fieldset>

      <div>
        <FieldLabel htmlFor="short_description" required>
          簡単な説明
        </FieldLabel>
        <input
          id="short_description"
          name="short_description"
          type="text"
          maxLength={120}
          defaultValue={training?.short_description ?? ''}
          className={`mt-1 ${inputClass}`}
        />
        <FieldError message={errors.short_description} />
      </div>

      <div>
        <FieldLabel htmlFor="description" required>
          詳しい説明
        </FieldLabel>
        <textarea
          id="description"
          name="description"
          rows={8}
          maxLength={2000}
          defaultValue={training?.description ?? ''}
          className={`mt-1 ${inputClass}`}
        />
        <FieldError message={errors.description} />
      </div>

      <fieldset>
        <legend className={legendClass}>必要な道具{requiredBadge}</legend>
        <p className="mt-1 text-xs text-slate-500">
          「{EQUIPMENT_LABELS[EQUIPMENT_EXCLUSIVE_CODE]}」を選ぶと他の道具は外れます。
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {EQUIPMENT_OPTIONS.map((option) => (
            <label key={option.code} className={optionClass}>
              <input
                type="checkbox"
                name="equipment"
                value={option.code}
                checked={equipment.includes(option.code)}
                onChange={() => toggleEquipment(option.code)}
                className="h-5 w-5 accent-sky-600"
              />
              <span className="text-sm text-slate-800">{option.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.equipment} />
      </fieldset>

      <fieldset>
        <legend className={legendClass}>対象年齢の目安{requiredBadge}</legend>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
          {AGE_GROUP_OPTIONS.map((option) => (
            <label key={option.code} className={optionClass}>
              <input
                type="checkbox"
                name="age_groups"
                value={option.code}
                checked={ageGroups.includes(option.code)}
                onChange={() => toggleAgeGroup(option.code)}
                className="h-5 w-5 accent-sky-600"
              />
              <span className="text-sm text-slate-800">{option.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.age_groups} />
      </fieldset>

      <fieldset>
        <legend className={legendClass}>推奨人数{requiredBadge}</legend>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row">
          {PEOPLE_OPTIONS.map((option) => (
            <label key={option.code} className={`${optionClass} flex-1`}>
              <input
                type="radio"
                name="people"
                value={option.code}
                defaultChecked={training?.people === option.code}
                className="h-5 w-5 accent-sky-600"
              />
              <span className="text-sm text-slate-800">{option.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.people} />
      </fieldset>

      <div>
        <FieldLabel>チェックリスト</FieldLabel>
        <div className="mt-2">
          <ChecklistEditor items={checklist} onChange={setChecklist} />
        </div>
        <FieldError message={errors.checklist} />
      </div>

      <div>
        <FieldLabel htmlFor="youtube_url">動画（YouTube URL）</FieldLabel>
        <input
          id="youtube_url"
          name="youtube_url"
          type="url"
          inputMode="url"
          placeholder="https://youtu.be/..."
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          className={`mt-1 ${inputClass}`}
        />
        <FieldError message={errors.youtube_url} />

        {youtubeUrl.trim() !== '' &&
          (embedUrl ? (
            <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg bg-slate-200">
              <iframe
                src={embedUrl}
                title="動画プレビュー"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-700">
              YouTubeのURLとして認識できません。プレビューは表示できません。
            </p>
          ))}
      </div>

      <div>
        <FieldLabel htmlFor="image">サムネイル画像</FieldLabel>
        <p className="mt-1 text-xs text-slate-500">
          JPEG・PNG・WebP／5MBまで。未設定のときは動画のサムネイルが使われます。
        </p>
        {training?.thumbnail_url && (
          <p className="mt-1 text-xs text-slate-500">
            現在の画像あり（新しく選ぶと差し替わります）
          </p>
        )}
        <input
          id="image"
          name="image"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:min-h-[44px] file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:text-sm file:font-bold file:text-slate-700"
        />
        <FieldError message={errors.image} />
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row-reverse">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700 disabled:opacity-60"
        >
          {isPending ? '保存中…' : training ? '更新する' : '登録する'}
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 active:bg-slate-100"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
