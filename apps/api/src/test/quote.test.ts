import './setup.js';
import { describe, it, expect } from 'vitest';
import { buildQuote } from '../services/quote.js';

describe('buildQuote', () => {
  it('builds a SOL→JOOBI quote with positive amounts', async () => {
    const q = await buildQuote({
      sourceToken: 'SOL',
      sourceAmount: '1',
      destinationToken: 'JOOBI',
      slippageBps: 200,
    });
    expect(Number(q.estimatedDestinationAmount)).toBeGreaterThan(0);
    expect(Number(q.minDestinationAmount)).toBeLessThanOrEqual(
      Number(q.estimatedDestinationAmount),
    );
    expect(q.expiresAt).toBeTruthy();
    expect(q.symbiosisQuoteId.startsWith('sym_')).toBe(true);
  });

  it('rejects swaps below the minimum USD threshold', async () => {
    await expect(
      buildQuote({
        sourceToken: 'USDC_SOL',
        sourceAmount: '1',
        destinationToken: 'TON',
      }),
    ).rejects.toThrow(/minimum/i);
  });

  it('rejects swaps above the maximum USD threshold', async () => {
    await expect(
      buildQuote({
        sourceToken: 'SOL',
        sourceAmount: '100',
        destinationToken: 'TON',
      }),
    ).rejects.toThrow(/maximum/i);
  });
});
