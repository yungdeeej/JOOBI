import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { swaps, swapEvents } from '../db/schema.js';
import { ORCHESTRATOR_QUEUE, redis, type OrchestratorJobData } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { stubSymbiosisService } from '../services/symbiosis.js';
import { stubStonFiService } from '../services/stonfi.js';
import { stubTonClient } from '../services/ton-client.js';
import { stubPrivyService } from '../services/privy.js';
import type { SwapState } from '@joobi/shared';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const transition = async (
  swapId: string,
  fromState: SwapState,
  toState: SwapState,
  payload: Record<string, unknown> = {},
  patch: Record<string, unknown> = {},
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
  logger.info({ swapId, fromState, toState }, 'state transition');
};

const fetchSwap = async (swapId: string) => {
  const rows = await db.select().from(swaps).where(eq(swaps.id, swapId)).limit(1);
  return rows[0] ?? null;
};

const runStateMachine = async (swapId: string) => {
  let swap = await fetchSwap(swapId);
  if (!swap) return;

  // WAITING_DEPOSIT -> DEPOSIT_DETECTED
  if (swap.state === 'WAITING_DEPOSIT') {
    const fakeTx = `dep_${swapId.slice(0, 8)}_${Date.now()}`;
    await transition(swapId, 'WAITING_DEPOSIT', 'DEPOSIT_DETECTED', { txHash: fakeTx }, {
      depositTxHash: swap.depositTxHash ?? fakeTx,
      actualReceivedAmount: swap.sourceAmount,
    });
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'DEPOSIT_DETECTED') {
    await sleep(2000);
    await transition(swapId, 'DEPOSIT_DETECTED', 'DEPOSIT_CONFIRMED');
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'DEPOSIT_CONFIRMED') {
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
    await transition(swapId, 'DEPOSIT_CONFIRMED', 'BRIDGING', { symbiosisQuoteId: symQuote.quoteId }, {
      bridgeTxHashSource: bridgeSourceTx,
      symbiosisQuoteId: symQuote.quoteId,
    });
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'BRIDGING') {
    await sleep(5000);
    const tracked = await stubSymbiosisService.trackSwap({
      chainId: 7565164,
      txHash: swap.bridgeTxHashSource ?? '',
    });
    await transition(swapId, 'BRIDGING', 'BRIDGE_CONFIRMED', { tracked }, {
      bridgeTxHashDestination: tracked.destinationTxHash ?? null,
      actualBridgedAmount: tracked.outputAmount ?? swap.quotedDestinationAmount,
    });
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'BRIDGE_CONFIRMED') {
    if (swap.destinationToken === 'TON') {
      // skip swap step
      await transition(swapId, 'BRIDGE_CONFIRMED', 'SENDING_TO_USER');
    } else {
      const stonQuote = await stubStonFiService.getJoobiQuote(
        swap.actualBridgedAmount ?? swap.quotedDestinationAmount ?? '0',
      );
      await transition(swapId, 'BRIDGE_CONFIRMED', 'SWAPPING_TO_DESTINATION', { stonQuote });
    }
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'SWAPPING_TO_DESTINATION') {
    await sleep(3000);
    const stonResult = await stubTonClient.sendBoc('stub-boc');
    await transition(swapId, 'SWAPPING_TO_DESTINATION', 'DESTINATION_SWAP_CONFIRMED', { txHash: stonResult.txHash }, {
      destinationSwapTxHash: stonResult.txHash,
    });
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'DESTINATION_SWAP_CONFIRMED') {
    await transition(swapId, 'DESTINATION_SWAP_CONFIRMED', 'SENDING_TO_USER');
    swap = (await fetchSwap(swapId))!;
  }

  if (swap.state === 'SENDING_TO_USER') {
    await sleep(2000);
    const payout = await stubTonClient.sendBoc('stub-payout-boc');
    const finalAmount =
      swap.destinationToken === 'JOOBI'
        ? swap.quotedDestinationAmount
        : swap.actualBridgedAmount ?? swap.quotedDestinationAmount;
    await transition(swapId, 'SENDING_TO_USER', 'COMPLETED', { txHash: payout.txHash }, {
      payoutTxHash: payout.txHash,
      actualDestinationAmount: finalAmount,
    });
    await stubPrivyService.destroyWallet(swap.privyWalletId);
  }
};

export const startOrchestratorWorker = () => {
  const worker = new Worker<OrchestratorJobData>(
    ORCHESTRATOR_QUEUE,
    async (job) => {
      const { swapId } = job.data;
      try {
        await runStateMachine(swapId);
      } catch (err) {
        logger.error({ err, swapId }, 'orchestrator failed');
        await db
          .update(swaps)
          .set({
            state: 'MANUAL_REVIEW',
            errorMessage: err instanceof Error ? err.message : String(err),
            updatedAt: new Date(),
          })
          .where(eq(swaps.id, swapId));
      }
    },
    { connection: redis, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'orchestrator worker job failed');
  });
  return worker;
};
