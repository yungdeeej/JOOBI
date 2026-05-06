import type { SourceToken } from '@joobi/shared';

const USD_PRICES: Record<SourceToken, number> = {
  SOL: 150,
  USDC_SOL: 1,
  USDT_SOL: 1,
};

export interface PriceService {
  getUsdPrice(symbol: SourceToken): Promise<number>;
  toUsd(symbol: SourceToken, amount: string): Promise<number>;
}

export const stubPriceService: PriceService = {
  async getUsdPrice(symbol) {
    return USD_PRICES[symbol];
  },
  async toUsd(symbol, amount) {
    return USD_PRICES[symbol] * Number(amount);
  },
};
