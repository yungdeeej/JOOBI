'use client';

import { useState } from 'react';
import type { SwapStatusResponse } from '@joobi/shared';
import { Check, ChevronDown, Copy, ExternalLink } from './ui/Icons';
import { cn } from '../lib/cn';

interface TxRow {
  label: string;
  hash: string | null;
  explorer: 'solana' | 'ton';
}

const explorerUrl = (hash: string, chain: 'solana' | 'ton'): string =>
  chain === 'solana'
    ? `https://solscan.io/tx/${hash}`
    : `https://tonviewer.com/transaction/${hash}`;

export function TxDetails({ swap }: { swap: SwapStatusResponse }) {
  const [open, setOpen] = useState(false);

  const rows: TxRow[] = [
    { label: 'Deposit', hash: swap.txHashes.deposit, explorer: 'solana' },
    { label: 'Bridge (source)', hash: swap.txHashes.bridgeSource, explorer: 'solana' },
    { label: 'Bridge (destination)', hash: swap.txHashes.bridgeDestination, explorer: 'ton' },
    { label: 'Destination swap', hash: swap.txHashes.destinationSwap, explorer: 'ton' },
    { label: 'Payout', hash: swap.txHashes.payout, explorer: 'ton' },
    { label: 'Refund', hash: swap.txHashes.refund, explorer: 'solana' },
  ];

  const present = rows.filter((r) => r.hash);
  if (present.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-sm font-medium text-zinc-200"
      >
        <span>Transaction details ({present.length})</span>
        <ChevronDown className={cn('h-4 w-4 text-zinc-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-white/[0.04] p-2">
          {present.map((r) => (
            <TxRowDisplay key={r.label} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function TxRowDisplay({ row }: { row: TxRow }) {
  const [copied, setCopied] = useState(false);
  if (!row.hash) return null;
  const truncated = `${row.hash.slice(0, 8)}…${row.hash.slice(-6)}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03]">
      <div>
        <div className="text-xs text-zinc-500">{row.label}</div>
        <div className="font-mono text-xs text-zinc-200">{truncated}</div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(row.hash!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          aria-label="Copy hash"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a
          href={explorerUrl(row.hash, row.explorer)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          aria-label="Open explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
