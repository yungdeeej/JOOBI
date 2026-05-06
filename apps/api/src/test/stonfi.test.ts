import './setup.js';
import { describe, it, expect } from 'vitest';
import { stubStonFiService } from '../services/stonfi.js';

describe('stubStonFiService', () => {
  it('returns more JOOBI for larger TON inputs (linear in stub)', async () => {
    const small = await stubStonFiService.getJoobiQuote('1');
    const large = await stubStonFiService.getJoobiQuote('100');
    expect(Number(large.joobiAmount)).toBeGreaterThan(Number(small.joobiAmount));
  });

  it('shows higher price impact for larger trades', async () => {
    const small = await stubStonFiService.getJoobiQuote('1');
    const huge = await stubStonFiService.getJoobiQuote('500');
    expect(huge.priceImpactPercent).toBeGreaterThan(small.priceImpactPercent);
  });
});
