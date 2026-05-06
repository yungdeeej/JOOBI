import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { swaps, swapEvents } from '../db/schema.js';
import {
  ORCHESTRATOR_QUEUE,
  redis,
  enqueueOrchestrator,
  type OrchestratorJobData,
} from '../lib/queue.js';
import { logger, redactAddress } from '../lib/logger.js';
import { stubSymbiosisService } from '../services/symbiosis.js';
import { stubStonFiService } from '../services/stonfi.js';
import { stubTonClient } from '../services/ton-client.js';
import { stubPrivyService } from '../services/privy.js';
import type { SwapState } from '@joobi/shared';

interface TransitionPatch {
  patch?: Partial<typeof swaps.$inferInsert>;
  payload?: Record<string, unknown>;
}

const writeTransition = async (
  swapId: string,
  fromState: SwapState,
  toState: SwapState,
  { patch = {}, payload = {} }: TransitionPatch = {},
) => {
  await db
    .update(swaps)
    .set({ state: toState, updatedAt: new Date(), ...patch })
    .where(eq(swaps.id, swapId));
  await db.insert(swapEvents).values({
    swapId,
    fromState,
    toState,
    payload,
  });
  logger.info(
    { swapId: redactAddress(swapId), fromState, toState },
    'state transition',
  );
};

const fetchSwap = async (swapId: string) => {
  const rows = await db.select().from(swaps).where(eq(swaps.id, swapId)).limit(1);
  return rows[0] ?? null;
};

interface AdvanceResult {
  /** Next state to wake on, or null if terminal/idle. */
  nextDelayMs: number | null;
}

/**
 * Run a single state transition for a swap. Returns the delay before the
 * next job should fire, or null if no further work is queued.
 */
const advanceOnce = async (swapId: string): Promise<AdvanceResult> => {
  const swap = await fetchSwap(swapId);
  if (!swap) return { nextDelayMs: null };

  switch (swap.state) {
    case 'WAITING_DEPOSIT': {
      const fakeTx = swap.depositTxHash ?? `dep_${swapId.slice(0, 8)}_${Date.now()}`;
      await writeTransition(swapId, 'WAITING_DEPOSIT', 'DEPOSIT_DETECTED', {
        patch: {
          depositTxHash: fakeTx,
          actualReceivedAmount: swap.sourceAmount,
        },
        payload: { txHash: fakeTx },
      });
      return { nextDelayMs: 2000 };
    }

    case 'DEPOSIT_DETECTED': {
      await writeTransition(swapId, 'DEPOSIT_DETECTED', 'DEPOSIT_CONFIRMED');
      return { nextDelayMs: 0 };
    }

    case 'DEPOSIT_CONFIRMED': {
      const symQuote = await stubSymbiosisService.getQuote({
        fromChainId: 7565164,
        toChainId: 85918,
        fromTokenAddress: '',
        toTokenAddress: '',
        amount: swap.sourceAmount,
        fromAddress: swap.depositAddress,
        toAddress: swap.destinationAddress,
        slippage: swap.slippageBps,
        partnerId: 'joobiswap',
      });
      const sigBase64 = Buffer.from(`tx_${swapId}`).toString('base64');
      const bridgeSourceTx = await stubPrivyService.signSolanaTransaction(
        swap.privyWalletId,
        sigBase64,
      );
      await writeTransition(swapId, 'DEPOSIT_CONFIRMED', 'BRIDGING', {
        patch: {
          bridgeTxHashSource: bridgeSourceTx,
          symbiosisQuoteId: symQuote.quoteId,
        },
        payload: { symbiosisQuoteId: symQuote.quoteId },
      });
      return { nextDelayMs: 5000 };
    }

    case 'BRIDGING': {
      const tracked = await stubSymbiosisService.trackSwap({
        chainId: 7565164,
        txHash: swap.bridgeTxHashSource ?? '',
      });
      await writeTransition(swapId, 'BRIDGING', 'BRIDGE_CONFIRMED', {
        patch: {
          bridgeTxHashDestination: tracked.destinationTxHash ?? null,
          actualBridgedAmount: tracked.outputAmount ?? swap.quotedDestinationAmount,
        },
        payload: { tracked },
      });
      return { nextDelayMs: 0 };
    }

    case 'BRIDGE_CONFIRMED': {
      if (swap.destinationToken === 'TON') {
        await writeTransition(swapId, 'BRIDGE_CONFIRMED', 'SENDING_TO_USER');
        return { nextDelayMs: 2000 };
      }
      const stonQuote = await stubStonFiService.getJoobiQuote(
        swap.actualBridgedAmount ?? swap.quotedDestinationAmount ?? '0',
      );
      await writeTransition(swapId, 'BRIDGE_CONFIRMED', 'SWAPPING_TO_DESTINATION', {
        payload: { stonQuote },
      });
      return { nextDelayMs: 3000 };
    }

    case 'SWAPPING_TO_DESTINATION': {
      const stonResult = await stubTonClient.sendBoc('stub-boc');
      await writeTransition(
        swapId,
        'SWAPPING_TO_DESTINATION',
        'DESTINATION_SWAP_CONFIRMED',
        {
          patch: { destinationSwapTxHash: stonResult.txHash },
          payload: { txHash: stonResult.txHash },
        },
      );
      return { nextDelayMs: 0 };
    }

    case 'DESTINATION_SWAP_CONFIRMED': {
      await writeTransition(swapId, 'DESTINATION_SWAP_CONFIRMED', 'SENDING_TO_USER');
      return { nextDelayMs: 2000 };
    }

    case 'SENDING_TO_USER': {
      const payout = await stubTonClient.sendBoc('stub-payout-boc');
      const finalAmount =
        swap.destinationToken === 'JOOBI'
          ? swap.quotedDestinationAmount
          : (swap.actualBridgedAmount ?? swap.quotedDestinationAmount);
      await writeTransition(swapId, 'SENDING_TO_USER', 'COMPLETED', {
        patch: {
          payoutTxHash: payout.txHash,
          actualDestinationAmount: finalAmount,
        },
        payload: { txHash: payout.txHash },
      });
      await stubPrivyService.destroyWallet(swap.privyWalletId);
      return { nextDelayMs: null };
    }

    // Terminal / non-advancing states.
    default:
      return { nextDelayMs: null };
  }
};

export const startOrchestratorWorker = () => {
  const worker = new Worker<OrchestratorJobData>(
    ORCHESTRATOR_QUEUE,
    async (job) => {
      const { swapId, expectFrom } = job.data;
      const current = await fetchSwap(swapId);
      if (!current) return;
      if (expectFrom && current.state !== expectFrom) {
        logger.debug(
          { swapId: redactAddress(swapId), expectFrom, actual: current.state },
          'state advanced by another worker — skipping',
        );
        return;
      }
      const next = await advanceOnce(swapId);
      if (next.nextDelayMs !== null) {
        const after = await fetchSwap(swapId);
        if (after) {
          await enqueueOrchestrator(
            { swapId, reason: 'tick', expectFrom: after.state },
            { delay: next.nextDelayMs, jobId: `${swapId}:${after.state}` },
          );
        }
      }
    },
    { connection: redis, concurrency: 8 },
  );

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err }, 'orchestrator job failed');
    if (job?.data?.swapId) {
      await db
        .update(swaps)
        .set({
          state: 'MANUAL_REVIEW',
          errorMessage: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(eq(swaps.id, job.data.swapId));
    }
  });

  return worker;
};
