import { MacroCategory, MACRO_SHORT, MACRO_BADGE_COLORS, MACRO_BG, MACRO_LABELS } from "../types";

export function MacroBadge({ category, showLabel = false }: { category: MacroCategory; showLabel?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-xs w-6 h-6 shrink-0 ${MACRO_BADGE_COLORS[category]}`}
      title={MACRO_LABELS[category]}
    >
      {MACRO_SHORT[category]}
    </span>
  );
}

export function MacroTag({ category }: { category: MacroCategory }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${MACRO_BG[category]}`}>
      <MacroBadge category={category} />
      {MACRO_LABELS[category]}
    </span>
  );
}
