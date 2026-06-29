import { ChevronDown, ChevronUp } from "lucide-react";

export function moveArrayItem<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const next = [...arr];
  const target = idx + dir;
  if (target < 0 || target >= next.length) return arr;
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}

export function ReorderButtons({
  idx,
  total,
  onMove,
}: {
  idx: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={idx === 0}
        className="p-0.5 text-gray-400 hover:text-emerald-600 disabled:opacity-20 rounded"
        title="Sposta su"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={idx === total - 1}
        className="p-0.5 text-gray-400 hover:text-emerald-600 disabled:opacity-20 rounded"
        title="Sposta giù"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
