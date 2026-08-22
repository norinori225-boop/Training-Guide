import { SAFETY_NOTICE } from '@/lib/constants';

/** 安全に関する注意書き。一覧のフッターと詳細ページで共用する。 */
export function SafetyNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ${className}`}
    >
      <span className="mr-1" aria-hidden="true">
        ⚠️
      </span>
      {SAFETY_NOTICE}
    </p>
  );
}
