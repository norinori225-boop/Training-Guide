'use client';

import { useState } from 'react';

/**
 * 実施中に使うチェックリスト。
 * 状態は保存しない（リロードで消えてよい）ので useState だけで持つ。
 */
export function Checklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() =>
    items.map(() => false),
  );

  const toggle = (index: number) => {
    setChecked((current) =>
      current.map((value, i) => (i === index ? !value : value)),
    );
  };

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 active:bg-slate-50">
            <input
              type="checkbox"
              checked={checked[index] ?? false}
              onChange={() => toggle(index)}
              className="h-6 w-6 shrink-0 accent-sky-600"
            />
            <span
              className={`text-sm leading-relaxed ${
                checked[index] ? 'text-slate-400 line-through' : 'text-slate-800'
              }`}
            >
              {item}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
