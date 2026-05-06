import './setup.js';
import { describe, it, expect } from 'vitest';
import { createSwapRequestSchema, quoteRequestSchema } from '@joobi/shared';

describe('zod schemas', () => {
  it('accepts a well-formed quote request', () => {
    const r = quoteRequestSchema.safeParse({
      sourceToken: 'SOL',
      sourceAmount: '1.5',
      destinationToken: 'JOOBI',
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative amounts', () => {
    const r = quoteRequestSchema.safeParse({
      sourceToken: 'SOL',
      sourceAmount: '-1',
      destinationToken: 'TON',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid TON addresses on swap creation', () => {
    const r = createSwapRequestSchema.safeParse({
      sourceToken: 'SOL',
      sourceAmount: '1',
      destinationToken: 'JOOBI',
      destinationAddress: 'not-a-ton-address',
      slippageBps: 200,
    });
    expect(r.success).toBe(false);
  });

  it('accepts a UQ-prefixed TON address', () => {
    const addr = 'UQ' + 'A'.repeat(46);
    const r = createSwapRequestSchema.safeParse({
      sourceToken: 'SOL',
      sourceAmount: '1',
      destinationToken: 'JOOBI',
      destinationAddress: addr,
      slippageBps: 200,
    });
    expect(r.success).toBe(true);
  });
});
