'use client';

import type { QuoteResponse } from '@joobi/shared';
import { Badge } from './ui/Badge';
import { Clock } from './ui/Icons';
import { tokenLabel, type TokenSymbol } from './ui/TokenIcon';

const impactTone = (impact: number): 'success' | 'warning' | 'orange' | 'danger' => {
  if (impact < 1) return 'success';
  if (impact < 3) return 'warning';
  if (impact < 5) return 'orange';
  return 'danger';
};

export function QuoteDisplay({
  quote,
  sourceToken,
  destinationToken,
}: {
  quote: QuoteResponse;
  sourceToken: TokenSymbol;
  destinationToken: TokenSymbol;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm backdrop-blur-xl">
      <Row
        label="Estimated received"
        value={
          <span className="font-semibold tabular-nums text-white">
            {Number(quote.estimatedDestinationAmount).toLocaleString()} {tokenLabel(destinationToken)}
          </span>
        }
      />
      <Row
        label="Minimum received"
        value={
          <span className="tabular-nums text-zinc-300">
            {Number(quote.minDestinationAmount).toLocaleString()} {tokenLabel(destinationToken)}
          </span>
        }
      />
      <Row
        label="Bridge fee"
        value={
          <span className="tabular-nums text-zinc-300">
            {quote.bridgeFeeAmount} {tokenLabel(sourceToken)}
          </span>
        }
      />
      <Row
        label="Platform fee (1%)"
        value={
          <span className="tabular-nums text-zinc-300">
            {quote.platformFeeAmount} {tokenLabel(sourceToken)}
          </span>
        }
      />
      <Row
        label="Estimated time"
        value={
          <span className="inline-flex items-center gap-1 text-zinc-300">
            <Clock className="h-3.5 w-3.5" />
            ~{quote.estimatedTotalSeconds}s
          </span>
        }
      />
      <Row
        label="Price impact"
        value={
          <Badge tone={impactTone(quote.priceImpactPercent)}>
            {quote.priceImpactPercent.toFixed(2)}%
          </Badge>
        }
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      {value}
    </div>
  );
}
