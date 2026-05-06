'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { isPositiveDecimal, isValidTonAddress } from '../lib/validation';
import { SlippageWarning } from './SlippageWarning';
import { QuoteDisplay } from './QuoteDisplay';

const SOURCE_TOKENS = ['SOL', 'USDC_SOL', 'USDT_SOL'] as const;
const DESTINATION_TOKENS = ['TON', 'JOOBI'] as const;

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
  const [sourceToken, setSourceToken] = useState<(typeof SOURCE_TOKENS)[number]>('SOL');
  const [destinationToken, setDestinationToken] = useState<(typeof DESTINATION_TOKENS)[number]>('JOOBI');
  const [sourceAmount, setSourceAmount] = useState('1');
  const [tonAddress, setTonAddress] = useState('');
  const [slippageBps, setSlippageBps] = useState(200);
  const [acceptedHighSlippage, setAcceptedHighSlippage] = useState(false);

  const debouncedAmount = useDebounced(sourceAmount, 500);
  const amountValid = isPositiveDecimal(debouncedAmount);

  const quoteQuery = useQuery({
    queryKey: ['quote', sourceToken, debouncedAmount, destinationToken],
    queryFn: () =>
      apiClient.getQuote({ sourceToken, sourceAmount: debouncedAmount, destinationToken }),
    enabled: amountValid,
    refetchInterval: 30_000,
  });

  const tonValid = isValidTonAddress(tonAddress);
  const priceImpact = quoteQuery.data?.priceImpactPercent ?? 0;
  const highImpact = priceImpact > 5;

  const canSubmit = useMemo(
    () => amountValid && tonValid && quoteQuery.data && (!highImpact || acceptedHighSlippage),
    [amountValid, tonValid, quoteQuery.data, highImpact, acceptedHighSlippage],
  );

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

  return (
    <div className="rounded-2xl bg-white/5 p-6 backdrop-blur ring-1 ring-white/10">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-white/70">You send</label>
          <div className="mt-1 flex gap-2">
            <select
              className="rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/10"
              value={sourceToken}
              onChange={(e) => setSourceToken(e.target.value as typeof sourceToken)}
            >
              {SOURCE_TOKENS.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_SOL', ' (Solana)')}
                </option>
              ))}
            </select>
            <input
              className="flex-1 rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/10"
              type="text"
              inputMode="decimal"
              value={sourceAmount}
              onChange={(e) => setSourceAmount(e.target.value)}
              placeholder="0.0"
            />
          </div>
        </div>

        <div className="text-center text-white/40 text-2xl">↓</div>

        <div>
          <label className="text-sm text-white/70">You receive (estimated)</label>
          <div className="mt-1 flex gap-2">
            <select
              className="rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/10"
              value={destinationToken}
              onChange={(e) => setDestinationToken(e.target.value as typeof destinationToken)}
            >
              {DESTINATION_TOKENS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className="flex-1 rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/10"
              type="text"
              readOnly
              value={quoteQuery.data?.estimatedDestinationAmount ?? '—'}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-white/70">Your TON address (destination)</label>
          <input
            className="mt-1 w-full rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/10"
            type="text"
            value={tonAddress}
            onChange={(e) => setTonAddress(e.target.value)}
            placeholder="UQ… or EQ…"
          />
          {tonAddress && !tonValid && (
            <p className="mt-1 text-xs text-red-400">Invalid TON address</p>
          )}
        </div>

        <details className="text-sm text-white/70">
          <summary className="cursor-pointer">Slippage settings (current: {(slippageBps / 100).toFixed(2)}%)</summary>
          <div className="mt-2 flex gap-2">
            {[100, 200, 300].map((bps) => (
              <button
                key={bps}
                type="button"
                onClick={() => setSlippageBps(bps)}
                className={`rounded-md px-3 py-1 ring-1 ring-white/10 ${
                  slippageBps === bps ? 'bg-brand text-white' : 'bg-black/30'
                }`}
              >
                {bps / 100}%
              </button>
            ))}
          </div>
        </details>

        {quoteQuery.data && <QuoteDisplay quote={quoteQuery.data} sourceToken={sourceToken} />}

        {highImpact && (
          <SlippageWarning
            impact={priceImpact}
            checked={acceptedHighSlippage}
            onChange={setAcceptedHighSlippage}
          />
        )}

        <button
          className="w-full rounded-lg bg-brand py-3 font-semibold text-white disabled:opacity-40"
          disabled={!canSubmit || createSwap.isPending}
          onClick={() => createSwap.mutate()}
        >
          {createSwap.isPending ? 'Creating swap…' : 'Create Swap'}
        </button>

        {createSwap.error && (
          <p className="text-sm text-red-400">{(createSwap.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
