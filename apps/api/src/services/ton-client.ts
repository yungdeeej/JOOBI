export interface TonClient {
  getJettonMetadata(jettonMaster: string): Promise<{
    name?: string;
    symbol?: string;
    decimals: number;
  }>;
  sendBoc(bocBase64: string): Promise<{ txHash: string }>;
}

export const stubTonClient: TonClient = {
  async getJettonMetadata(_master) {
    return { name: 'JOOBI', symbol: 'JOOBI', decimals: 9 };
  },
  async sendBoc(_boc) {
    const hash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return { txHash: hash };
  },
};
