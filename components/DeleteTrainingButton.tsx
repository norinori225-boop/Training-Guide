'use client';

import { useActionState } from 'react';
import { deleteTrainingAction } from '@/app/actions/trainings';
import type { ActionResult } from '@/lib/schemas';

const INITIAL_STATE: ActionResult = { ok: true };

/** 削除ボタン。送信前に確認ダイアログを挟む。 */
export function DeleteTrainingButton({
  trainingId,
  title,
}: {
  trainingId: string;
  title: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    deleteTrainingAction,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const ok = window.confirm(
          `「${title}」を削除します。\nこの操作は取り消せません。よろしいですか？`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={trainingId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-red-300 bg-white px-4 text-sm font-bold text-red-700 active:bg-red-50 disabled:opacity-60"
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
