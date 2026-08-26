'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from '@/app/actions/categories';
import type { ActionResult } from '@/lib/schemas';
import type { CategoryWithUsage } from '@/lib/queries';
import { ErrorSummary, FieldError, inputClass } from '@/components/FormField';

const INITIAL_STATE: ActionResult = { ok: true };

const smallInputClass =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200';

export function CategoryManager({
  categories,
}: {
  categories: CategoryWithUsage[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <CreateCategoryForm />

      <section>
        <h2 className="mb-2 text-base font-bold text-slate-900">
          登録済みカテゴリー（{categories.length}件）
        </h2>
        <ul className="flex flex-col gap-3">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CreateCategoryForm() {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    createCategoryAction,
    INITIAL_STATE,
  );

  const formRef = useRef<HTMLFormElement>(null);

  // 追加に成功したら入力欄を空に戻す（useActionState は成功するまで
  // INITIAL_STATE と同じ参照を返すので、参照比較で「送信済み」を判定できる）
  useEffect(() => {
    if (state !== INITIAL_STATE && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-base font-bold text-slate-900">
        カテゴリーを追加
      </h2>

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <ErrorSummary message={state.message} fieldErrors={state.fieldErrors} />

        <div>
          <label
            htmlFor="new-name"
            className="text-sm font-bold text-slate-800"
          >
            カテゴリー名
          </label>
          <input
            id="new-name"
            name="name"
            type="text"
            maxLength={30}
            className={`mt-1 ${inputClass}`}
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label
            htmlFor="new-slug"
            className="text-sm font-bold text-slate-800"
          >
            slug
          </label>
          <p className="text-xs text-slate-500">
            半角の英小文字・数字・ハイフンのみ。登録後は変更できません。
          </p>
          <input
            id="new-slug"
            name="slug"
            type="text"
            maxLength={40}
            placeholder="run, change-direction など"
            className={`mt-1 ${inputClass}`}
          />
          <FieldError message={errors.slug} />
        </div>

        <div>
          <label
            htmlFor="new-sort"
            className="text-sm font-bold text-slate-800"
          >
            表示順
          </label>
          <input
            id="new-sort"
            name="sort_order"
            type="number"
            inputMode="numeric"
            defaultValue={0}
            min={0}
            max={9999}
            className={`mt-1 ${inputClass}`}
          />
          <FieldError message={errors.sort_order} />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-sky-600 px-6 text-sm font-bold text-white active:bg-sky-700 disabled:opacity-60"
        >
          {isPending ? '追加中…' : '追加する'}
        </button>
      </form>
    </section>
  );
}

function CategoryRow({ category }: { category: CategoryWithUsage }) {
  const [isEditing, setIsEditing] = useState(false);
  const inUse = category.usageCount > 0;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      {isEditing ? (
        <EditCategoryForm
          category={category}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900">
                {category.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                slug: {category.slug} ／ 表示順: {category.sort_order}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {category.usageCount}件で使用中
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 active:bg-slate-100"
            >
              編集
            </button>
            <DeleteCategoryButton category={category} />
          </div>

          {inUse && (
            <p className="mt-2 text-xs text-slate-500">
              このカテゴリーを使っている種目があるため削除できません
            </p>
          )}
        </>
      )}
    </li>
  );
}

function EditCategoryForm({
  category,
  onDone,
}: {
  category: CategoryWithUsage;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    updateCategoryAction,
    INITIAL_STATE,
  );

  // 保存に成功したら編集モードを閉じる
  useEffect(() => {
    if (state !== INITIAL_STATE && state.ok) {
      onDone();
    }
  }, [state, onDone]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={category.id} />

      <ErrorSummary message={state.message} fieldErrors={state.fieldErrors} />

      <div>
        <label
          htmlFor={`name-${category.id}`}
          className="text-sm font-bold text-slate-800"
        >
          カテゴリー名
        </label>
        <input
          id={`name-${category.id}`}
          name="name"
          type="text"
          maxLength={30}
          defaultValue={category.name}
          className={`mt-1 ${smallInputClass}`}
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label
          htmlFor={`sort-${category.id}`}
          className="text-sm font-bold text-slate-800"
        >
          表示順
        </label>
        <input
          id={`sort-${category.id}`}
          name="sort_order"
          type="number"
          inputMode="numeric"
          defaultValue={category.sort_order}
          min={0}
          max={9999}
          className={`mt-1 ${smallInputClass}`}
        />
        <FieldError message={errors.sort_order} />
      </div>

      <p className="text-xs text-slate-500">
        slug（{category.slug}）は URL・コード用のため変更できません。
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-sky-600 px-4 text-sm font-bold text-white active:bg-sky-700 disabled:opacity-60"
        >
          {isPending ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 active:bg-slate-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function DeleteCategoryButton({ category }: { category: CategoryWithUsage }) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    deleteCategoryAction,
    INITIAL_STATE,
  );

  const inUse = category.usageCount > 0;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const ok = window.confirm(
          `カテゴリー「${category.name}」を削除します。よろしいですか？`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={category.id} />
      <button
        type="submit"
        disabled={inUse || isPending}
        title={
          inUse
            ? 'このカテゴリーを使っている種目があるため削除できません'
            : undefined
        }
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-red-300 bg-white px-4 text-sm font-bold text-red-700 active:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
      >
        {isPending ? '削除中…' : '削除'}
      </button>
      {!state.ok && state.message && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
