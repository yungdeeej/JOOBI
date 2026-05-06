import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { swaps } from '../db/schema.js';
import { env } from '../lib/env.js';
import { orchestratorQueue } from '../lib/queue.js';
import { NotFoundError, UnauthorizedError } from '../lib/errors.js';

export const adminRouter = Router();

const requireAdmin = (req: import('express').Request) => {
  const auth = req.header('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== env.ADMIN_API_TOKEN) {
    throw new UnauthorizedError('Invalid admin token');
  }
};

adminRouter.post('/swaps/:id/simulate-deposit', async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'production') {
      throw new UnauthorizedError('simulate-deposit disabled in production');
    }
    const id = req.params.id!;
    const matches = await db
      .select()
      .from(swaps)
      .where(eq(swaps.id, id))
      .limit(1);
    let swap = matches[0];
    if (!swap) {
      const byPublic = await db.select().from(swaps).where(eq(swaps.publicId, id)).limit(1);
      swap = byPublic[0];
    }
    if (!swap) throw new NotFoundError('Swap not found');
    await orchestratorQueue.add(
      'simulate',
      { swapId: swap.id, reason: 'simulate-deposit' },
      { jobId: `sim-${swap.id}-${Date.now()}` },
    );
    res.json({ ok: true, swapId: swap.id, publicId: swap.publicId });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/swaps/:id/refund', async (req, res, next) => {
  try {
    requireAdmin(req);
    const matches = await db.select().from(swaps).where(eq(swaps.id, req.params.id!)).limit(1);
    const swap = matches[0];
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
    const matches = await db.select().from(swaps).where(eq(swaps.id, req.params.id!)).limit(1);
    const swap = matches[0];
    if (!swap) throw new NotFoundError('Swap not found');
    await orchestratorQueue.add(
      'retry',
      { swapId: swap.id, reason: 'tick' },
      { jobId: `retry-${swap.id}-${Date.now()}` },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
