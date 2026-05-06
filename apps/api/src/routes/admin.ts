import { Router, type Request } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { swaps } from '../db/schema.js';
import { env } from '../lib/env.js';
import { enqueueOrchestrator } from '../lib/queue.js';
import { NotFoundError, UnauthorizedError } from '../lib/errors.js';

export const adminRouter = Router();

const requireAdmin = (req: Request) => {
  const auth = req.header('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== env.ADMIN_API_TOKEN) {
    throw new UnauthorizedError('Invalid admin token');
  }
};

const findSwapByIdOrPublicId = async (idOrPublic: string) => {
  const byId = await db.select().from(swaps).where(eq(swaps.id, idOrPublic)).limit(1);
  if (byId[0]) return byId[0];
  const byPublic = await db.select().from(swaps).where(eq(swaps.publicId, idOrPublic)).limit(1);
  return byPublic[0] ?? null;
};

adminRouter.post('/swaps/:id/simulate-deposit', async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'production') {
      throw new UnauthorizedError('simulate-deposit disabled in production');
    }
    const swap = await findSwapByIdOrPublicId(req.params.id!);
    if (!swap) throw new NotFoundError('Swap not found');
    await enqueueOrchestrator(
      { swapId: swap.id, reason: 'simulate-deposit', expectFrom: 'WAITING_DEPOSIT' },
      { jobId: `${swap.id}:WAITING_DEPOSIT` },
    );
    res.json({ ok: true, swapId: swap.id, publicId: swap.publicId });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/swaps/:id/refund', async (req, res, next) => {
  try {
    requireAdmin(req);
    const swap = await findSwapByIdOrPublicId(req.params.id!);
    if (!swap) throw new NotFoundError('Swap not found');
    await db
      .update(swaps)
      .set({ state: 'REFUND_REQUIRED', updatedAt: new Date() })
      .where(eq(swaps.id, swap.id));
    res.json({ ok: true, state: 'REFUND_REQUIRED' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/swaps/:id/retry', async (req, res, next) => {
  try {
    requireAdmin(req);
    const swap = await findSwapByIdOrPublicId(req.params.id!);
    if (!swap) throw new NotFoundError('Swap not found');
    await enqueueOrchestrator(
      { swapId: swap.id, reason: 'retry' },
      { jobId: `${swap.id}:retry:${Date.now()}` },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
