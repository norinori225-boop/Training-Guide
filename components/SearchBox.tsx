'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

/**
 * キーワード検索の入力欄。
 * 入力を URL の ?q= に反映し、実際の絞り込みはサーバー側で行う。
 */
export function SearchBox({ query }: { query: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(query);
  // 自分が最後に URL へ書き込んだ値。外からの変更と自分の入力を区別するために持つ。
  const lastPushed = useRef(query);

  // 「すべて表示に戻る」などで外から q が変わったときに入力欄を追従させる
  useEffect(() => {
    if (query !== lastPushed.current) {
      lastPushed.current = query;
      setValue(query);
    }
  }, [query]);

  // 入力を 300ms 止めてから URL を書き換える
  useEffect(() => {
    if (value === lastPushed.current) return;

    const timer = setTimeout(() => {
      lastPushed.current = value;

      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative">
      <label htmlFor="training-search" className="sr-only">
        トレーニングを検索
      </label>

      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        🔍
      </span>

      <input
        id="training-search"
        type="search"
        inputMode="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="種目名・説明・道具で検索（例: ラダー）"
        className="min-h-[44px] w-full rounded-full border border-slate-300 bg-white py-2 pl-10 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
      />

      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="検索キーワードを消す"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
        >
          ✕
        </button>
      )}

      <span aria-live="polite" className="sr-only">
        {isPending ? '検索中' : ''}
      </span>
    </div>
  );
}
