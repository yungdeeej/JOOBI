'use client';

import type { QuoteResponse } from '@joobi/shared';

const impactColor = (impact: number): string => {
  if (impact < 1) return 'bg-green-600/40 text-green-200';
  if (impact < 3) return 'bg-yellow-600/40 text-yellow-200';
  if (impact < 5) return 'bg-orange-600/40 text-orange-200';
  return 'bg-red-600/40 text-red-200';
};

export function QuoteDisplay({
  quote,
  sourceToken,
}: {
  quote: QuoteResponse;
  sourceToken: string;
}) {
  return (
    <div className="rounded-lg bg-black/30 p-4 text-sm space-y-1 ring-1 ring-white/10">
      <div className="flex justify-between">
        <span className="text-white/60">Estimated received</span>
        <span>{quote.estimatedDestinationAmount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/60">Minimum received</span>
        <span>{quote.minDestinationAmount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/60">Bridge fee</span>
        <span>
          {quote.bridgeFeeAmount} {sourceToken.replace('_SOL', '')}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/60">Platform fee</span>
        <span>
          {quote.platformFeeAmount} {sourceToken.replace('_SOL', '')}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/60">Estimated time</span>
        <span>~{quote.estimatedTotalSeconds}s</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white/60">Price impact</span>
        <span className={`rounded-md px-2 py-0.5 text-xs ${impactColor(quote.priceImpactPercent)}`}>
          {quote.priceImpactPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
