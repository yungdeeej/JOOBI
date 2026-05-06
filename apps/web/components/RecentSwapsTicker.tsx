'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, type RecentSwap } from '../lib/api-client';
import { TokenIcon, tokenLabel, type TokenSymbol } from './ui/TokenIcon';
import { ArrowRight } from './ui/Icons';

const FALLBACK: RecentSwap[] = [
  {
    id: '••••a3f1',
    sourceToken: 'SOL',
    destinationToken: 'JOOBI',
    sourceAmount: '0.5',
    destinationAmount: '3,290.42',
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: '••••8c20',
    sourceToken: 'USDC_SOL',
    destinationToken: 'TON',
    sourceAmount: '120',
    destinationAmount: '19.1',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: '••••11e5',
    sourceToken: 'SOL',
    destinationToken: 'TON',
    sourceAmount: '1.25',
    destinationAmount: '31.4',
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
];

const ago = (iso: string): string => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

export function RecentSwapsTicker() {
  const { data } = useQuery({
    queryKey: ['recent-swaps'],
    queryFn: () => apiClient.getRecentSwaps().catch(() => FALLBACK),
    refetchInterval: 15_000,
  });

  const list = (data && data.length > 0 ? data : FALLBACK).slice(0, 6);
  const doubled = [...list, ...list];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Recent swaps
      </div>
      <div className="relative overflow-hidden">
        <div className="flex w-max gap-3 animate-marquee">
          {doubled.map((s, i) => (
            <RecentSwapPill key={`${s.id}-${i}`} swap={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentSwapPill({ swap }: { swap: RecentSwap }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 px-3 py-2 text-xs">
      <TokenIcon symbol={swap.sourceToken as TokenSymbol} size={20} />
      <span className="text-zinc-300">
        {swap.sourceAmount} {tokenLabel(swap.sourceToken as TokenSymbol)}
      </span>
      <ArrowRight className="h-3 w-3 text-zinc-500" />
      <TokenIcon symbol={swap.destinationToken as TokenSymbol} size={20} />
      <span className="text-zinc-300">
        {swap.destinationAmount ?? '—'} {tokenLabel(swap.destinationToken as TokenSymbol)}
      </span>
      <span className="ml-2 text-zinc-500">· {ago(swap.createdAt)}</span>
    </div>
  );
}
