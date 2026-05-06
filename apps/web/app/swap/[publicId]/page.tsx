'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TERMINAL_STATES } from '@joobi/shared';
import { apiClient } from '../../../lib/api-client';
import { DepositInstructions } from '../../../components/DepositInstructions';
import { StatusTimeline, stateLabel, stateSublabel } from '../../../components/StatusTimeline';
import { TxDetails } from '../../../components/TxDetails';
import { Confetti } from '../../../components/Confetti';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { CardElevated, Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { TokenIcon, tokenLabel, type TokenSymbol } from '../../../components/ui/TokenIcon';
import { ArrowRight, AlertTriangle } from '../../../components/ui/Icons';

const stateTone = (s: string): 'brand' | 'success' | 'danger' | 'warning' | 'neutral' => {
  if (s === 'COMPLETED' || s === 'REFUNDED') return 'success';
  if (s === 'FAILED' || s === 'EXPIRED') return 'danger';
  if (s === 'MANUAL_REVIEW' || s === 'REFUND_REQUIRED' || s === 'REFUND_IN_PROGRESS')
    return 'warning';
  return 'brand';
};

export default function SwapStatusPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['swap', publicId],
    queryFn: () => apiClient.getSwap(publicId),
    refetchInterval: (query) => {
      const s = query.state.data?.state;
      if (s && TERMINAL_STATES.has(s)) return false;
      return 3000;
    },
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-10 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12">
          <Card className="p-6 text-rose-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span>Could not load swap: {(error as Error)?.message ?? 'not found'}</span>
            </div>
            <Link href="/" className="mt-4 inline-block text-sm text-brand-300 hover:text-white">
              ← Back to home
            </Link>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  const showDeposit = data.state === 'WAITING_DEPOSIT';
  const completed = data.state === 'COMPLETED';
  const expired = data.state === 'EXPIRED';

  return (
    <>
      <Header />
      {completed && <Confetti />}
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-5">
        {/* Header card */}
        <CardElevated className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">Swap</div>
              <div className="font-mono text-sm text-zinc-300">{data.publicId}</div>
            </div>
            <Badge tone={stateTone(data.state)}>{stateLabel(data.state)}</Badge>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <TokenIcon symbol={data.sourceToken as TokenSymbol} size={26} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">From</div>
                <div className="text-sm font-semibold tabular-nums text-white">
                  {data.sourceAmount} {tokenLabel(data.sourceToken as TokenSymbol)}
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-500" />
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <TokenIcon symbol={data.destinationToken as TokenSymbol} size={26} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">To</div>
                <div className="text-sm font-semibold tabular-nums text-white">
                  {data.actualDestinationAmount ?? data.quotedDestinationAmount ?? '—'}{' '}
                  {tokenLabel(data.destinationToken as TokenSymbol)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-zinc-500">
            {stateSublabel(data.state)}
          </div>
        </CardElevated>

        {showDeposit && (
          <DepositInstructions
            depositAddress={data.depositAddress}
            amount={data.exactDepositAmount}
            sourceToken={data.sourceToken as TokenSymbol}
            expiresAt={data.expiresAt}
          />
        )}

        {expired && (
          <Card className="p-5 text-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <div>
                <div className="font-semibold text-rose-100">Deposit window expired</div>
                <div className="mt-1 text-sm text-rose-200/80">
                  No deposit was detected within 20 minutes. Create a new swap to try again.
                  Funds sent to the deposit address after expiry are detected and queued for
                  manual review.
                </div>
                <Link href="/" className="mt-3 inline-block text-sm text-brand-300 hover:text-white">
                  ← Start a new swap
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Timeline */}
        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold text-zinc-200">Progress</div>
          <StatusTimeline state={data.state} />
        </Card>

        {completed && (
          <CardElevated className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                ✓
              </div>
              <div>
                <div className="font-semibold text-white">Swap complete</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Sent <span className="text-white">{data.actualDestinationAmount}</span>{' '}
                  {tokenLabel(data.destinationToken as TokenSymbol)} to
                </div>
                <div className="mt-1 break-all rounded-lg bg-black/30 px-2 py-1 font-mono text-xs text-zinc-300">
                  {data.destinationAddress}
                </div>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-white"
                >
                  Start another swap →
                </Link>
              </div>
            </div>
          </CardElevated>
        )}

        <TxDetails swap={data} />

        {data.errorMessage && (
          <Card className="p-4 text-sm text-rose-200">
            {data.errorMessage}
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}
