import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Stateful in-memory store for mocked DB.
interface SwapRow extends Record<string, unknown> {
  id: string;
  publicId: string;
  state: string;
  destinationToken: string;
  sourceToken: string;
  sourceAmount: string;
  destinationAddress: string;
  depositAddress: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const store = {
  swaps: [] as SwapRow[],
  events: [] as Array<Record<string, unknown>>,
};

const reset = () => {
  store.swaps.length = 0;
  store.events.length = 0;
};

let app: Express;

beforeAll(async () => {
  // Mock drizzle's query helpers as lightweight predicates / order specs.
  vi.mock('drizzle-orm', () => {
    const eq = (col: unknown, value: unknown) => ({
      kind: 'eq' as const,
      col,
      value,
    });
    const and = (...preds: unknown[]) => ({ kind: 'and' as const, preds });
    const desc = (col: unknown) => ({ kind: 'desc' as const, col });
    const inArray = (col: unknown, values: unknown[]) => ({
      kind: 'inArray' as const,
      col,
      values,
    });
    const lt = (col: unknown, value: unknown) => ({ kind: 'lt' as const, col, value });
    const sql = (..._args: unknown[]) => ({ kind: 'sql' as const });
    sql.toString = () => '';
    return { eq, and, desc, inArray, lt, sql };
  });

  // Replace the db module with a minimal in-memory implementation that
  // exposes just enough of the drizzle query builder to satisfy the routes
  // we're testing.
  vi.mock('../db/client.js', () => {
    const matchPredicate = (row: SwapRow, pred: any): boolean => {
      if (!pred) return true;
      if (pred.kind === 'eq') {
        const colName = pred.col?.fieldName ?? pred.col?.name ?? pred.col?.['_'] ?? null;
        if (typeof colName !== 'string') return false;
        return row[colName] === pred.value;
      }
      if (pred.kind === 'and') return pred.preds.every((p: any) => matchPredicate(row, p));
      if (pred.kind === 'inArray') {
        const colName = pred.col?.fieldName ?? pred.col?.name ?? null;
        return colName ? pred.values.includes(row[colName]) : false;
      }
      if (pred.kind === 'lt') {
        const colName = pred.col?.fieldName ?? pred.col?.name ?? null;
        return colName ? (row[colName] as number) < (pred.value as number) : false;
      }
      return true;
    };

    const tableName = (table: any): string => {
      const sym = Object.getOwnPropertySymbols(table ?? {}).find(
        (s) => s.toString() === 'Symbol(drizzle:Name)',
      );
      if (sym) return (table as any)[sym];
      return table?._?.name ?? '';
    };

    const selectFrom = (cols?: any) => {
      let target: 'swaps' | 'events' | 'tokens' | 'webhook' | 'unknown' = 'unknown';
      let pred: any = null;
      let order: any = null;
      let lim: number | null = null;

      const exec = async () => {
        let rows: Record<string, unknown>[] =
          target === 'swaps'
            ? [...store.swaps]
            : target === 'events'
              ? [...store.events]
              : [];
        rows = rows.filter((r) => matchPredicate(r as SwapRow, pred));
        if (order && order.kind === 'desc') {
          const colName = order.col?.fieldName ?? order.col?.name;
          if (colName) {
            rows.sort((a, b) =>
              (a[colName] as number | string) < (b[colName] as number | string) ? 1 : -1,
            );
          }
        }
        if (lim !== null) rows = rows.slice(0, lim);

        // Aggregate-style queries (stats summary) request a "total" / "completed" / "active" object.
        if (cols && typeof cols === 'object' && 'total' in cols) {
          return [
            {
              total: rows.length,
              completed: rows.filter((r) => r.state === 'COMPLETED').length,
              active: rows.filter(
                (r) =>
                  r.state !== 'COMPLETED' &&
                  r.state !== 'EXPIRED' &&
                  r.state !== 'REFUNDED' &&
                  r.state !== 'FAILED',
              ).length,
            },
          ];
        }
        return rows;
      };

      const chain: any = {
        from(table: any) {
          const name = tableName(table);
          target =
            name === 'swaps'
              ? 'swaps'
              : name === 'swap_events'
                ? 'events'
                : name === 'webhook_events'
                  ? 'webhook'
                  : 'unknown';
          return chain;
        },
        where(p: any) {
          pred = p;
          return chain;
        },
        orderBy(o: any) {
          order = o;
          return chain;
        },
        limit(n: number) {
          lim = n;
          return chain;
        },
        then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
          exec().then(resolve, reject);
        },
        catch(reject: (e: unknown) => void) {
          return exec().catch(reject);
        },
      };
      return chain;
    };

    const insertInto = (table: any) => {
      const name = tableName(table);
      let staged: Record<string, unknown>[] = [];
      const chain: any = {
        values(v: Record<string, unknown> | Record<string, unknown>[]) {
          staged = Array.isArray(v) ? v : [v];
          if (name === 'swaps') {
            for (const row of staged) {
              const swap: SwapRow = {
                id: (row.id as string) ?? crypto.randomUUID(),
                publicId: row.publicId as string,
                state: (row.state as string) ?? 'WAITING_DEPOSIT',
                destinationToken: row.destinationToken as string,
                sourceToken: row.sourceToken as string,
                sourceAmount: row.sourceAmount as string,
                destinationAddress: row.destinationAddress as string,
                depositAddress: row.depositAddress as string,
                expiresAt: (row.expiresAt as Date) ?? new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                ...row,
              };
              store.swaps.push(swap);
            }
          } else if (name === 'swap_events') {
            for (const row of staged) {
              store.events.push({ ...row, id: store.events.length + 1, createdAt: new Date() });
            }
          }
          return chain;
        },
        returning() {
          return Promise.resolve(staged);
        },
        onConflictDoNothing() {
          return chain;
        },
        then(resolve: (v: unknown) => void) {
          resolve(undefined);
        },
      };
      return chain;
    };

    const updateTable = (_table: any) => {
      const chain: any = {
        set: () => chain,
        where: () => chain,
        returning: async () => [],
        then: (r: (v: unknown) => void) => r(undefined),
      };
      return chain;
    };

    const db = {
      select: (cols?: any) => selectFrom(cols),
      insert: (table: any) => insertInto(table),
      update: (table: any) => updateTable(table),
    };
    return { db, sqlClient: { end: async () => {} } };
  });

  vi.mock('../lib/queue.js', () => ({
    enqueueOrchestrator: vi.fn(async () => undefined),
    redis: undefined,
    orchestratorQueue: { add: vi.fn() },
    orchestratorEvents: {},
    ORCHESTRATOR_QUEUE: 'orchestrator',
  }));

  const mod = await import('../app.js');
  app = mod.buildApp();
});

describe('API integration', () => {
  it('GET /health responds OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('POST /api/quotes returns a SOL→JOOBI quote', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({ sourceToken: 'SOL', sourceAmount: '1', destinationToken: 'JOOBI' });
    expect(res.status).toBe(200);
    expect(Number(res.body.estimatedDestinationAmount)).toBeGreaterThan(0);
    expect(Number(res.body.minDestinationAmount)).toBeLessThanOrEqual(
      Number(res.body.estimatedDestinationAmount),
    );
  });

  it('POST /api/quotes rejects below-minimum amounts', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({ sourceToken: 'USDC_SOL', sourceAmount: '1', destinationToken: 'TON' });
    expect(res.status).toBe(400);
  });

  it('POST /api/quotes rejects unknown source tokens', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({ sourceToken: 'NOPE', sourceAmount: '1', destinationToken: 'JOOBI' });
    expect(res.status).toBe(400);
  });

  it('GET /api/stats/summary returns counts', async () => {
    reset();
    const res = await request(app).get('/api/stats/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('completed');
    expect(res.body).toHaveProperty('active');
  });

  it('rejects swaps with invalid TON addresses', async () => {
    const res = await request(app).post('/api/swaps').send({
      sourceToken: 'SOL',
      sourceAmount: '1',
      destinationToken: 'JOOBI',
      destinationAddress: 'not-a-ton-address',
      slippageBps: 200,
    });
    expect(res.status).toBe(400);
  });
});
