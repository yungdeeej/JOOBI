'use client';

import { ACTIVE_TIMELINE, type SwapState } from '@joobi/shared';
import { Check, Loader } from './ui/Icons';
import { cn } from '../lib/cn';

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

const SUBLABELS: Record<SwapState, string> = {
  WAITING_DEPOSIT: 'Send your funds to the deposit address',
  DEPOSIT_DETECTED: 'Watching for confirmations',
  DEPOSIT_CONFIRMED: 'Initiating cross-chain bridge',
  BRIDGING: 'Symbiosis is bridging your funds',
  BRIDGE_CONFIRMED: 'Funds have arrived on TON',
  SWAPPING_TO_DESTINATION: 'STON.fi is executing the swap',
  DESTINATION_SWAP_CONFIRMED: 'Preparing payout',
  SENDING_TO_USER: 'Final transfer to your wallet',
  COMPLETED: '🎉',
  EXPIRED: 'Deposit window closed',
  REFUND_REQUIRED: 'Initiating refund',
  REFUND_IN_PROGRESS: 'Returning funds to source',
  REFUNDED: 'Funds returned',
  MANUAL_REVIEW: 'Our team is investigating',
  FAILED: 'Contact support',
};

export function StatusTimeline({ state }: { state: SwapState }) {
  const idx = ACTIVE_TIMELINE.indexOf(state);
  const visible = ACTIVE_TIMELINE.filter(
    (s) => !(state === 'BRIDGE_CONFIRMED' && s === 'SWAPPING_TO_DESTINATION'),
  );
  return (
    <ol className="relative space-y-1">
      {visible.map((s, i) => {
        const sIdx = ACTIVE_TIMELINE.indexOf(s);
        const status =
          idx < 0 ? 'pending' : sIdx < idx ? 'done' : sIdx === idx ? 'active' : 'pending';
        const isLast = i === visible.length - 1;
        return (
          <li key={s} className="relative flex gap-4 pb-3">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px',
                  status === 'done' ? 'bg-emerald-500/50' : 'bg-white/[0.08]',
                )}
              />
            )}
            <div
              className={cn(
                'relative grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 transition',
                status === 'done' &&
                  'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
                status === 'active' &&
                  'bg-brand-500/15 text-brand-300 ring-brand-500/40 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]',
                status === 'pending' &&
                  'bg-white/[0.03] text-zinc-600 ring-white/[0.06]',
              )}
            >
              {status === 'done' ? (
                <Check className="h-4 w-4" />
              ) : status === 'active' ? (
                <Loader className="h-4 w-4" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </div>
            <div className="pt-0.5">
              <div
                className={cn(
                  'text-sm font-medium',
                  status === 'done' && 'text-zinc-300',
                  status === 'active' && 'text-white',
                  status === 'pending' && 'text-zinc-500',
                )}
              >
                {LABELS[s]}
              </div>
              <div className="text-xs text-zinc-500">{SUBLABELS[s]}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const stateLabel = (s: SwapState) => LABELS[s];
export const stateSublabel = (s: SwapState) => SUBLABELS[s];
