import { and, eq, lt, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { swaps, swapEvents } from '../db/schema.js';
import { logger } from '../lib/logger.js';

const STUCK_AFTER_MS = 10 * 60 * 1000;

const expireUnpaidSwaps = async () => {
  const now = new Date();
  const expired = await db
    .update(swaps)
    .set({ state: 'EXPIRED', updatedAt: now })
    .where(and(eq(swaps.state, 'WAITING_DEPOSIT'), lt(swaps.expiresAt, now)))
    .returning();
  for (const s of expired) {
    await db.insert(swapEvents).values({
      swapId: s.id,
      fromState: 'WAITING_DEPOSIT',
      toState: 'EXPIRED',
      payload: { reason: 'deposit-window-expired' },
    });
  }
  if (expired.length > 0) {
    logger.info({ count: expired.length }, 'expired unpaid swaps');
  }
};

const flagStuckSwaps = async () => {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS);
  const stuck = await db
    .update(swaps)
    .set({ state: 'MANUAL_REVIEW', updatedAt: new Date() })
    .where(
      and(
        inArray(swaps.state, [
          'DEPOSIT_DETECTED',
          'DEPOSIT_CONFIRMED',
          'BRIDGING',
          'BRIDGE_CONFIRMED',
          'SWAPPING_TO_DESTINATION',
          'DESTINATION_SWAP_CONFIRMED',
          'SENDING_TO_USER',
        ]),
        lt(swaps.updatedAt, cutoff),
      ),
    )
    .returning();
  for (const s of stuck) {
    await db.insert(swapEvents).values({
      swapId: s.id,
      fromState: s.state,
      toState: 'MANUAL_REVIEW',
      payload: { reason: 'stuck-too-long' },
    });
  }
};

export const startTimeoutMonitor = () => {
  const interval = setInterval(() => {
    Promise.all([expireUnpaidSwaps(), flagStuckSwaps()]).catch((err) => {
      logger.error({ err }, 'timeout monitor failure');
    });
  }, 30_000);
  return () => clearInterval(interval);
};
