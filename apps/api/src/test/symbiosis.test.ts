import './setup.js';
import { describe, it, expect } from 'vitest';
import { stubSymbiosisService } from '../services/symbiosis.js';

describe('stubSymbiosisService', () => {
  it('quotes 1 SOL to ~25 TON minus fee', async () => {
    const q = await stubSymbiosisService.getQuote({
      fromChainId: 7565164,
      toChainId: 85918,
      fromTokenAddress: '',
      toTokenAddress: '',
      amount: '1',
      fromAddress: 'a',
      toAddress: 'b',
      slippage: 200,
      partnerId: 'joobiswap',
    });
    expect(Number(q.tokenAmountOut)).toBeGreaterThan(24);
    expect(Number(q.tokenAmountOut)).toBeLessThan(25.1);
    expect(Number(q.tokenAmountOutMin)).toBeLessThan(Number(q.tokenAmountOut));
  });

  it('reports stub success on trackSwap', async () => {
    const tracked = await stubSymbiosisService.trackSwap({ chainId: 7565164, txHash: 'abc' });
    expect(tracked.status).toBe('success');
    expect(tracked.destinationTxHash).toBeTruthy();
  });
});
