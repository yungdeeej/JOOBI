import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createSwapRequestSchema,
  type SwapStatusResponse,
  type SourceToken,
  type DestinationToken,
} from '@joobi/shared';
import { db } from '../db/client.js';
import { swaps, swapEvents } from '../db/schema.js';
import { stubPrivyService } from '../services/privy.js';
import { stubHeliusService } from '../services/helius.js';
import { buildQuote } from '../services/quote.js';
import { env } from '../lib/env.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export const swapsRouter = Router();

swapsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createSwapRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid swap request', parsed.error.flatten());
    const body = parsed.data;

    if (body.clientRequestId) {
      const existing = await db
        .select()
        .from(swaps)
        .where(eq(swaps.clientRequestId, body.clientRequestId))
        .limit(1);
      if (existing[0]) {
        const swap = existing[0];
        return res.json({
          publicId: swap.publicId,
          depositAddress: swap.depositAddress,
          exactDepositAmount: swap.sourceAmount,
          expiresAt: swap.expiresAt.toISOString(),
          statusUrl: `/swap/${swap.publicId}`,
        });
      }
    }

    const quote = await buildQuote({
      sourceToken: body.sourceToken,
      sourceAmount: body.sourceAmount,
      destinationToken: body.destinationToken,
      slippageBps: body.slippageBps,
    });

    const wallet = await stubPrivyService.createEphemeralSolanaWallet('pending');
    await stubHeliusService.registerWebhookAddress(wallet.address);

    const publicId = `swp_${nanoid(12)}`;
    const expiresAt = new Date(Date.now() + env.DEPOSIT_TTL_SECONDS * 1000);

    const [inserted] = await db
      .insert(swaps)
      .values({
        publicId,
        sourceToken: body.sourceToken,
        sourceAmount: body.sourceAmount,
        destinationToken: body.destinationToken,
        destinationAddress: body.destinationAddress,
        slippageBps: body.slippageBps,
        depositAddress: wallet.address,
        privyWalletId: wallet.walletId,
        quotedDestinationAmount: quote.estimatedDestinationAmount,
        minDestinationAmount: quote.minDestinationAmount,
        symbiosisQuoteId: quote.symbiosisQuoteId,
        quotedAt: new Date(),
        expiresAt,
        platformFeeBps: env.PLATFORM_FEE_BPS,
        platformFeeAmount: quote.platformFeeAmount,
        bridgeFeeAmount: quote.bridgeFeeAmount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
        clientRequestId: body.clientRequestId ?? null,
      })
      .returning();

    if (!inserted) throw new Error('Failed to create swap');

    await db.insert(swapEvents).values({
      swapId: inserted.id,
      fromState: null,
      toState: 'WAITING_DEPOSIT',
      payload: { reason: 'created' },
    });

    res.json({
      publicId: inserted.publicId,
      depositAddress: inserted.depositAddress,
      exactDepositAmount: inserted.sourceAmount,
      expiresAt: inserted.expiresAt.toISOString(),
      statusUrl: `/swap/${inserted.publicId}`,
    });
  } catch (err) {
    next(err);
  }
});

swapsRouter.get('/:publicId', async (req, res, next) => {
  try {
    const result = await db
      .select()
      .from(swaps)
      .where(eq(swaps.publicId, req.params.publicId!))
      .limit(1);
    const swap = result[0];
    if (!swap) throw new NotFoundError('Swap not found');

    const response: SwapStatusResponse = {
      publicId: swap.publicId,
      state: swap.state,
      sourceToken: swap.sourceToken as SourceToken,
      sourceAmount: swap.sourceAmount,
      destinationToken: swap.destinationToken as DestinationToken,
      destinationAddress: swap.destinationAddress,
      depositAddress: swap.depositAddress,
      exactDepositAmount: swap.sourceAmount,
      quotedDestinationAmount: swap.quotedDestinationAmount,
      minDestinationAmount: swap.minDestinationAmount,
      actualDestinationAmount: swap.actualDestinationAmount,
      expiresAt: swap.expiresAt.toISOString(),
      createdAt: swap.createdAt.toISOString(),
      updatedAt: swap.updatedAt.toISOString(),
      txHashes: {
        deposit: swap.depositTxHash,
        bridgeSource: swap.bridgeTxHashSource,
        bridgeDestination: swap.bridgeTxHashDestination,
        destinationSwap: swap.destinationSwapTxHash,
        payout: swap.payoutTxHash,
        refund: swap.refundTxHash,
      },
      errorMessage: swap.errorMessage,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});
