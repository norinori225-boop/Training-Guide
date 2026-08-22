import { INTENSITY_BADGE_CLASSES, INTENSITY_LABELS } from '@/lib/constants';
import type { IntensityCode } from '@/lib/types';

/**
 * 強度バッジ。
 * 色（弱=緑 / 中=黄 / 強=赤）だけで区別させず、必ず文字を併記する。
 */
export function IntensityBadge({
  intensity,
  size = 'sm',
}: {
  intensity: IntensityCode;
  size?: 'sm' | 'md';
}) {
  const sizeClass =
    size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-bold ${sizeClass} ${INTENSITY_BADGE_CLASSES[intensity]}`}
    >
      <span aria-hidden="true">●</span>
      強度 {INTENSITY_LABELS[intensity]}
    </span>
  );
}
