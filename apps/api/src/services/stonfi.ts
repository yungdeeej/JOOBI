import crypto from 'node:crypto';

export interface StonFiService {
  getJoobiQuote(tonAmount: string): Promise<{
    joobiAmount: string;
    minOut: string;
    priceImpactPercent: number;
  }>;
  buildSwapTx(params: {
    tonAmount: string;
    minJoobiOut: string;
    recipientAddress: string;
    slippageBps: number;
  }): Promise<{ to: string; value: string; payload: string }>;
}

const JOOBI_PER_TON = 270;

export const stubStonFiService: StonFiService = {
  async getJoobiQuote(tonAmount) {
    const ton = Number(tonAmount);
    // Crude impact model that scales with size of trade.
    const usdNotional = ton * 6; // ~$6/TON
    const impactPercent = Math.min(8, (usdNotional / 39000) * 5);
    const effectiveRate = JOOBI_PER_TON * (1 - impactPercent / 100);
    const joobi = ton * effectiveRate;
    const minOut = joobi * 0.98;
    return {
      joobiAmount: joobi.toFixed(6),
      minOut: minOut.toFixed(6),
      priceImpactPercent: Number(impactPercent.toFixed(2)),
    };
  },
  async buildSwapTx(_params) {
    return {
      to: 'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt',
      value: '0',
      payload: `stub_payload_${crypto.randomBytes(8).toString('hex')}`,
    };
  },
};
