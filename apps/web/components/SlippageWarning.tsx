'use client';

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
    <label className="flex items-start gap-2 rounded-lg bg-red-900/40 p-3 text-sm ring-1 ring-red-500/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span>
        I understand I will lose ~{impact.toFixed(2)}% to price impact and slippage on this swap.
      </span>
    </label>
  );
}
