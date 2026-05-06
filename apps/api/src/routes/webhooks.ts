import { Router, raw } from 'express';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../db/client.js';
import { swaps, webhookEvents } from '../db/schema.js';
import { stubHeliusService } from '../services/helius.js';
import { enqueueOrchestrator } from '../lib/queue.js';
import { logger, redactAddress } from '../lib/logger.js';
import { UnauthorizedError } from '../lib/errors.js';

export const webhooksRouter = Router();

interface HeliusTransferPayload {
  type?: string;
  tokenTransfers?: Array<{ toUserAccount?: string; tokenAmount?: number; mint?: string }>;
  nativeTransfers?: Array<{ toUserAccount?: string; amount?: number }>;
  signature?: string;
}

const claimEvent = async (provider: string, externalId: string, payloadHash: string) => {
  try {
    await db.insert(webhookEvents).values({ provider, externalId, payloadHash });
    return true;
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) return false;
    throw err;
  }
};

webhooksRouter.post('/helius', raw({ type: '*/*' }), async (req, res, next) => {
  try {
    const rawBody =
      req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    const authHeader = req.header('x-helius-auth');
    if (!stubHeliusService.verifyWebhookAuth(authHeader)) {
      throw new UnauthorizedError('Invalid webhook auth');
    }
    const sigHeader = req.header('x-helius-signature');
    if (sigHeader && !stubHeliusService.verifyWebhookSignature(rawBody, sigHeader)) {
      throw new UnauthorizedError('Invalid webhook signature');
    }

    const events: HeliusTransferPayload[] = JSON.parse(rawBody);

    for (const ev of events) {
      const externalId =
        ev.signature ?? crypto.createHash('sha256').update(JSON.stringify(ev)).digest('hex');
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(ev)).digest('hex');
      const claimed = await claimEvent('helius', externalId, payloadHash);
      if (!claimed) {
        logger.debug({ externalId: redactAddress(externalId) }, 'duplicate webhook ignored');
        continue;
      }

      const recipients = new Set<string>();
      ev.nativeTransfers?.forEach((t) => t.toUserAccount && recipients.add(t.toUserAccount));
      ev.tokenTransfers?.forEach((t) => t.toUserAccount && recipients.add(t.toUserAccount));

      for (const addr of recipients) {
        const matches = await db
          .select()
          .from(swaps)
          .where(eq(swaps.depositAddress, addr))
          .limit(1);
        const swap = matches[0];
        if (!swap || swap.state !== 'WAITING_DEPOSIT') continue;
        await db
          .update(swaps)
          .set({ depositTxHash: ev.signature ?? null, updatedAt: new Date() })
          .where(eq(swaps.id, swap.id));
        await enqueueOrchestrator(
          { swapId: swap.id, reason: 'deposit-detected', expectFrom: 'WAITING_DEPOSIT' },
          { jobId: `${swap.id}:WAITING_DEPOSIT` },
        );
        logger.info({ swapId: redactAddress(swap.id) }, 'webhook deposit enqueued');
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
