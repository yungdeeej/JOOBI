'use client';

import { AlertTriangle } from './ui/Icons';

export function SlippageWarning({
  impact,
  checked,
  onChange,
}: {
  impact: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] p-4 text-sm">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-rose-500/20 text-rose-300">
        <AlertTriangle className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-rose-100">
        High price impact —{' '}
        <span className="font-semibold">{impact.toFixed(2)}%</span> of value will be lost on this
        swap. Consider a smaller amount.
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 cursor-pointer accent-rose-500"
      />
    </label>
  );
}
