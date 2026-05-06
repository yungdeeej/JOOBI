'use client';

import { useEffect, useRef, useState } from 'react';
import { TokenIcon, tokenChain, tokenLabel, type TokenSymbol } from './TokenIcon';
import { ChevronDown } from './Icons';
import { cn } from '../../lib/cn';

export function TokenSelect<T extends TokenSymbol>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-2 transition hover:bg-white/[0.07]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <TokenIcon symbol={value} size={28} />
        <span className="text-left">
          <span className="block text-sm font-semibold leading-tight text-white">
            {tokenLabel(value)}
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
            {tokenChain(value)}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-56 origin-top-right rounded-xl border border-white/[0.08] bg-zinc-900/95 p-1 shadow-soft backdrop-blur-xl animate-fade-in"
          role="listbox"
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition',
                opt === value ? 'bg-white/[0.06]' : 'hover:bg-white/[0.05]',
              )}
              role="option"
              aria-selected={opt === value}
            >
              <TokenIcon symbol={opt} size={28} />
              <span className="flex-1">
                <span className="block font-medium text-white">{tokenLabel(opt)}</span>
                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                  {tokenChain(opt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
