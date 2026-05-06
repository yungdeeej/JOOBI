'use client';

import { ACTIVE_TIMELINE, type SwapState } from '@joobi/shared';

const LABELS: Record<SwapState, string> = {
  WAITING_DEPOSIT: 'Waiting for deposit',
  DEPOSIT_DETECTED: 'Deposit detected',
  DEPOSIT_CONFIRMED: 'Deposit confirmed',
  BRIDGING: 'Bridging to TON',
  BRIDGE_CONFIRMED: 'Bridge confirmed',
  SWAPPING_TO_DESTINATION: 'Swapping on STON.fi',
  DESTINATION_SWAP_CONFIRMED: 'Swap confirmed',
  SENDING_TO_USER: 'Sending to your address',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  REFUND_REQUIRED: 'Refund required',
  REFUND_IN_PROGRESS: 'Refund in progress',
  REFUNDED: 'Refunded',
  MANUAL_REVIEW: 'Manual review',
  FAILED: 'Failed',
};

export function StatusTimeline({ state }: { state: SwapState }) {
  const idx = ACTIVE_TIMELINE.indexOf(state);
  return (
    <ol className="space-y-2">
      {ACTIVE_TIMELINE.map((s, i) => {
        const status = idx < 0 ? 'pending' : i < idx ? 'done' : i === idx ? 'active' : 'pending';
        const dot =
          status === 'done' ? '✓' : status === 'active' ? '●' : '○';
        const cls =
          status === 'done'
            ? 'text-green-400'
            : status === 'active'
              ? 'text-brand-light animate-pulse'
              : 'text-white/40';
        return (
          <li key={s} className={`flex items-center gap-3 ${cls}`}>
            <span className="font-mono">{dot}</span>
            <span className="text-sm">{LABELS[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export const stateLabel = (s: SwapState) => LABELS[s];
