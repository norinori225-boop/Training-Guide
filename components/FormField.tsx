/** 項目下のエラー表示 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-red-700">
      {message}
    </p>
  );
}

/** フォーム上部のエラーまとめ */
export function ErrorSummary({
  message,
  fieldErrors,
}: {
  message?: string;
  fieldErrors?: Record<string, string>;
}) {
  const items = Object.values(fieldErrors ?? {});
  if (!message && items.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <p className="font-bold">入力内容を確認してください</p>
      {message && <p className="mt-1">{message}</p>}
      {items.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** ラベル＋必須バッジ */
export function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-bold text-slate-800">
      {children}
      {required && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
          必須
        </span>
      )}
    </label>
  );
}

export const inputClass =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200';
