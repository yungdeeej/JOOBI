'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { isPositiveDecimal, isValidTonAddress } from '../lib/validation';
import { SlippageWarning } from './SlippageWarning';
import { QuoteDisplay } from './QuoteDisplay';
import { TokenSelect } from './ui/TokenSelect';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ArrowUpDown, Settings, Check } from './ui/Icons';
import type { TokenSymbol } from './ui/TokenIcon';
import { cn } from '../lib/cn';

const SOURCE_TOKENS = ['SOL', 'USDC_SOL', 'USDT_SOL'] as const;
const DESTINATION_TOKENS = ['TON', 'JOOBI'] as const;

const USD_PRICE: Record<(typeof SOURCE_TOKENS)[number], number> = {
  SOL: 150,
  USDC_SOL: 1,
  USDT_SOL: 1,
};

const SLIPPAGE_PRESETS = [
  { bps: 100, label: '1%' },
  { bps: 200, label: '2%' },
  { bps: 300, label: '3%' },
];

const useDebounced = <T,>(value: T, delay = 500): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export function SwapForm() {
  const router = useRouter();
  const [sourceToken, setSourceToken] =
    useState<(typeof SOURCE_TOKENS)[number]>('SOL');
  const [destinationToken, setDestinationToken] =
    useState<(typeof DESTINATION_TOKENS)[number]>('JOOBI');
  const [sourceAmount, setSourceAmount] = useState('1');
  const [tonAddress, setTonAddress] = useState('');
  const [slippageBps, setSlippageBps] = useState(200);
  const [customSlippage, setCustomSlippage] = useState('');
  const [showSlippage, setShowSlippage] = useState(false);
  const [acceptedHighSlippage, setAcceptedHighSlippage] = useState(false);

  const debouncedAmount = useDebounced(sourceAmount, 400);
  const amountValid = isPositiveDecimal(debouncedAmount);

  const usdEquivalent = useMemo(
    () =>
      amountValid
        ? (Number(debouncedAmount) * USD_PRICE[sourceToken]).toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2,
          })
        : null,
    [amountValid, debouncedAmount, sourceToken],
  );

  const quoteQuery = useQuery({
    queryKey: ['quote', sourceToken, debouncedAmount, destinationToken],
    queryFn: () =>
      apiClient.getQuote({
        sourceToken,
        sourceAmount: debouncedAmount,
        destinationToken,
      }),
    enabled: amountValid,
    refetchInterval: 30_000,
  });

  const tonValid = isValidTonAddress(tonAddress);
  const priceImpact = quoteQuery.data?.priceImpactPercent ?? 0;
  const highImpact = priceImpact > 5;

  const canSubmit =
    amountValid &&
    tonValid &&
    !!quoteQuery.data &&
    (!highImpact || acceptedHighSlippage) &&
    !quoteQuery.isFetching;

  const createSwap = useMutation({
    mutationFn: () =>
      apiClient.createSwap({
        sourceToken,
        sourceAmount: debouncedAmount,
        destinationToken,
        destinationAddress: tonAddress.trim(),
        slippageBps,
        clientRequestId: crypto.randomUUID(),
      }),
    onSuccess: (data) => {
      router.push(`/swap/${data.publicId}`);
    },
  });

  const handleCustomSlippage = (val: string) => {
    setCustomSlippage(val);
    if (!val) return;
    const num = Number(val);
    if (Number.isFinite(num) && num >= 0.1 && num <= 10) {
      setSlippageBps(Math.round(num * 100));
    }
  };

  return (
    <div className="space-y-3">
      {/* Source */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 backdrop-blur-xl transition focus-within:border-brand-400/40">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-zinc-500">You send</span>
          {usdEquivalent && (
            <span className="text-zinc-400">≈ {usdEquivalent}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <TokenSelect
            value={sourceToken}
            options={SOURCE_TOKENS}
            onChange={(v) => setSourceToken(v as typeof sourceToken)}
          />
          <input
            type="text"
            inputMode="decimal"
            value={sourceAmount}
            onChange={(e) => setSourceAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.0"
            className="flex-1 bg-transparent text-right text-2xl font-semibold tabular-nums text-white placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Swap-direction toggle */}
      <div className="relative -my-5 flex justify-center">
        <button
          type="button"
          aria-label="Swap source and destination"
          disabled
          className="grid h-10 w-10 cursor-not-allowed place-items-center rounded-xl border border-white/[0.08] bg-zinc-950 text-zinc-400 shadow-soft"
          title="One-way swap: Solana → TON"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </div>

      {/* Destination */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-zinc-500">You receive</span>
          {quoteQuery.data && (
            <span className="text-zinc-400">
              min {Number(quoteQuery.data.minDestinationAmount).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <TokenSelect
            value={destinationToken}
            options={DESTINATION_TOKENS}
            onChange={(v) => setDestinationToken(v as typeof destinationToken)}
          />
          <div className="flex-1 text-right text-2xl font-semibold tabular-nums text-white">
            {quoteQuery.isLoading && amountValid ? (
              <span className="inline-block h-7 w-32 animate-pulse rounded bg-white/[0.05]" />
            ) : (
              <span>{quoteQuery.data?.estimatedDestinationAmount ?? '—'}</span>
            )}
          </div>
        </div>
      </div>

      {/* TON address */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs uppercase tracking-wider text-zinc-500">
          <span>Your TON destination address</span>
          {tonAddress && (
            <span>
              {tonValid ? (
                <Badge tone="success">
                  <Check className="h-3 w-3" />
                  Valid
                </Badge>
              ) : (
                <Badge tone="danger">Invalid</Badge>
              )}
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <Input
            value={tonAddress}
            onChange={(e) => setTonAddress(e.target.value)}
            placeholder="UQ… or EQ…"
            invalid={!!tonAddress && !tonValid}
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={async () => {
              try {
                const t = await navigator.clipboard.readText();
                setTonAddress(t.trim());
              } catch {
                /* ignore */
              }
            }}
          >
            Paste
          </Button>
        </div>
      </div>

      {/* Slippage settings */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setShowSlippage((v) => !v)}
          className="flex w-full items-center justify-between text-sm text-zinc-300"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-500" />
            Slippage tolerance
          </span>
          <span className="font-semibold tabular-nums">
            {(slippageBps / 100).toFixed(2)}%
          </span>
        </button>
        {showSlippage && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SLIPPAGE_PRESETS.map((p) => (
              <button
                key={p.bps}
                type="button"
                onClick={() => {
                  setSlippageBps(p.bps);
                  setCustomSlippage('');
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  slippageBps === p.bps && !customSlippage
                    ? 'bg-brand-500 text-white shadow-glow'
                    : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]',
                )}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={customSlippage}
                onChange={(e) =>
                  handleCustomSlippage(e.target.value.replace(/[^0-9.]/g, ''))
                }
                placeholder="Custom"
                className="h-8 w-20 rounded-lg border border-white/[0.06] bg-black/30 px-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <span className="text-xs text-zinc-500">%</span>
            </div>
          </div>
        )}
      </div>

      {/* Quote */}
      {quoteQuery.data && (
        <QuoteDisplay
          quote={quoteQuery.data}
          sourceToken={sourceToken as TokenSymbol}
          destinationToken={destinationToken as TokenSymbol}
        />
      )}

      {highImpact && (
        <SlippageWarning
          impact={priceImpact}
          checked={acceptedHighSlippage}
          onChange={setAcceptedHighSlippage}
        />
      )}

      <Button
        size="lg"
        className="mt-2 w-full"
        disabled={!canSubmit}
        loading={createSwap.isPending}
        onClick={() => createSwap.mutate()}
      >
        {createSwap.isPending ? 'Creating swap…' : 'Create swap'}
      </Button>

      {createSwap.error && (
        <p className="text-center text-sm text-rose-400">
          {(createSwap.error as Error).message}
        </p>
      )}
    </div>
  );
}
