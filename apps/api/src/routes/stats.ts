import { Router } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { swaps } from '../db/schema.js';
import { redactAddress } from '../lib/logger.js';

export const statsRouter = Router();

statsRouter.get('/summary', async (_req, res, next) => {
  try {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${swaps.state} = 'COMPLETED')::int`,
        active: sql<number>`count(*) filter (where ${swaps.state} not in ('COMPLETED','EXPIRED','REFUNDED','FAILED'))::int`,
      })
      .from(swaps);
    res.json({
      total: row?.total ?? 0,
      completed: row?.completed ?? 0,
      active: row?.active ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

statsRouter.get('/recent', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        publicId: swaps.publicId,
        sourceToken: swaps.sourceToken,
        destinationToken: swaps.destinationToken,
        sourceAmount: swaps.sourceAmount,
        actualDestinationAmount: swaps.actualDestinationAmount,
        quotedDestinationAmount: swaps.quotedDestinationAmount,
        createdAt: swaps.createdAt,
        state: swaps.state,
      })
      .from(swaps)
      .where(eq(swaps.state, 'COMPLETED'))
      .orderBy(desc(swaps.createdAt))
      .limit(10);
    res.json(
      rows.map((r) => ({
        id: redactAddress(r.publicId),
        sourceToken: r.sourceToken,
        destinationToken: r.destinationToken,
        sourceAmount: r.sourceAmount,
        destinationAmount: r.actualDestinationAmount ?? r.quotedDestinationAmount,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    next(err);
  }
});
