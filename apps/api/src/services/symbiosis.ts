import crypto from 'node:crypto';

export interface SymbiosisQuoteParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippage: number;
  partnerId: string;
}

export interface SymbiosisQuoteResult {
  quoteId: string;
  tokenAmountOut: string;
  tokenAmountOutMin: string;
  estimatedTimeSeconds: number;
  priceImpactPercent: number;
  feeAmount: string;
  tx: { data: string; to: string; value: string };
}

export interface SymbiosisTrackResult {
  status: 'pending' | 'success' | 'failed' | 'stucked';
  destinationTxHash?: string;
  outputAmount?: string;
}

export interface SymbiosisService {
  getQuote(params: SymbiosisQuoteParams): Promise<SymbiosisQuoteResult>;
  trackSwap(params: { chainId: number; txHash: string }): Promise<SymbiosisTrackResult>;
  getStuckedSwaps(address: string): Promise<
    Array<{
      transactionHash: string;
      fromChainId: number;
      toChainId: number;
      type: 'burn' | 'synthesize';
    }>
  >;
}

// Stub conversion rates: fixed for deterministic E2E test.
// 1 SOL = 25 TON, 1 USDC = 0.16 TON, 1 USDT = 0.16 TON
const TON_PER_UNIT: Record<string, number> = {
  SOL: 25,
  USDC: 0.16,
  USDT: 0.16,
};

const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KConKy4G6gS9X9TzYHBh';

const tokenSymbol = (chainId: number, address: string): string => {
  if (chainId === 7565164) {
    if (address === '' || address.toLowerCase() === 'native') return 'SOL';
    if (address === SOLANA_USDC) return 'USDC';
    if (address === SOLANA_USDT) return 'USDT';
  }
  if (chainId === 85918) return 'TON';
  return 'UNKNOWN';
};

export const stubSymbiosisService: SymbiosisService = {
  async getQuote(params) {
    const fromSym = tokenSymbol(params.fromChainId, params.fromTokenAddress);
    const ratio = TON_PER_UNIT[fromSym] ?? 1;
    const amount = Number(params.amount);
    const grossOut = amount * ratio;
    const bridgeFee = grossOut * 0.005;
    const out = grossOut - bridgeFee;
    const min = out * (1 - params.slippage / 10000);
    const priceImpact = Math.min(0.8, 0.1 + amount / 10000);
    return {
      quoteId: `sym_${crypto.randomBytes(6).toString('hex')}`,
      tokenAmountOut: out.toFixed(6),
      tokenAmountOutMin: min.toFixed(6),
      estimatedTimeSeconds: 75,
      priceImpactPercent: Number(priceImpact.toFixed(2)),
      feeAmount: bridgeFee.toFixed(6),
      tx: { data: '0x', to: '0x', value: '0' },
    };
  },
  async trackSwap(_params) {
    return { status: 'success', destinationTxHash: `stub_dest_${crypto.randomBytes(6).toString('hex')}` };
  },
  async getStuckedSwaps(_address) {
    return [];
  },
};
