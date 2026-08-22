'use client';

import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_ITEM_LENGTH } from '@/lib/schemas';

/**
 * チェックリストの可変入力欄。
 * 値は name="checklist" で送られ、空文字は Server Action 側で除去される。
 */
export function ChecklistEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const update = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () => {
    if (items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange([...items, '']);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="text-xs text-slate-500">
          項目はまだありません。「＋項目を追加」で増やせます。
        </p>
      )}

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <input
            type="text"
            name="checklist"
            value={item}
            maxLength={MAX_CHECKLIST_ITEM_LENGTH}
            onChange={(event) => update(index, event.target.value)}
            placeholder={`項目 ${index + 1}`}
            aria-label={`チェックリスト項目 ${index + 1}`}
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button
            type="button"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`項目 ${index + 1} を上へ`}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move(index, 1)}
            disabled={index === items.length - 1}
            aria-label={`項目 ${index + 1} を下へ`}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label={`項目 ${index + 1} を削除`}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-red-600"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={items.length >= MAX_CHECKLIST_ITEMS}
          className="inline-flex min-h-[44px] items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 active:bg-slate-100 disabled:opacity-50"
        >
          ＋項目を追加
        </button>
        <span className="text-xs text-slate-500">
          {items.length} / {MAX_CHECKLIST_ITEMS} 件
        </span>
      </div>
    </div>
  );
}
