'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { DepositInstructions } from '../../../components/DepositInstructions';
import { StatusTimeline, stateLabel } from '../../../components/StatusTimeline';

export default function SwapStatusPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['swap', publicId],
    queryFn: () => apiClient.getSwap(publicId),
    refetchInterval: 3000,
  });

  if (isLoading) return <main className="p-6 text-white/70">Loading…</main>;
  if (error)
    return (
      <main className="p-6 text-red-300">Error loading swap: {(error as Error).message}</main>
    );
  if (!data) return null;

  const showDeposit = data.state === 'WAITING_DEPOSIT';
  const completed = data.state === 'COMPLETED';

  return (
    <main className="mx-auto max-w-xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Swap {data.publicId}</h1>
      <div className="rounded-lg bg-white/5 p-4 ring-1 ring-white/10">
        <div className="text-white/60 text-sm">Current status</div>
        <div className="text-xl">{stateLabel(data.state)}</div>
      </div>

      {showDeposit && (
        <DepositInstructions
          depositAddress={data.depositAddress}
          amount={data.exactDepositAmount}
          sourceToken={data.sourceToken}
          expiresAt={data.expiresAt}
        />
      )}

      <div className="rounded-lg bg-white/5 p-4 ring-1 ring-white/10">
        <h2 className="font-semibold mb-3">Progress</h2>
        <StatusTimeline state={data.state} />
      </div>

      {completed && (
        <div className="rounded-lg bg-green-900/30 p-4 text-green-200 ring-1 ring-green-500/40">
          🎉 Swap completed! Sent {data.actualDestinationAmount} {data.destinationToken} to {data.destinationAddress}.
        </div>
      )}

      <details className="rounded-lg bg-white/5 p-4 ring-1 ring-white/10 text-sm">
        <summary className="cursor-pointer">Transaction details</summary>
        <ul className="mt-2 space-y-1 text-white/70">
          <li>Deposit tx: <span className="font-mono break-all">{data.txHashes.deposit ?? '—'}</span></li>
          <li>Bridge source tx: <span className="font-mono break-all">{data.txHashes.bridgeSource ?? '—'}</span></li>
          <li>Bridge dest tx: <span className="font-mono break-all">{data.txHashes.bridgeDestination ?? '—'}</span></li>
          <li>Destination swap tx: <span className="font-mono break-all">{data.txHashes.destinationSwap ?? '—'}</span></li>
          <li>Payout tx: <span className="font-mono break-all">{data.txHashes.payout ?? '—'}</span></li>
        </ul>
      </details>

      {data.errorMessage && (
        <div className="rounded-lg bg-red-900/30 p-4 text-red-200 ring-1 ring-red-500/40">
          {data.errorMessage}
        </div>
      )}
    </main>
  );
}
