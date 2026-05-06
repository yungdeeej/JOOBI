import crypto from 'node:crypto';

export interface PrivyService {
  createEphemeralSolanaWallet(swapId: string): Promise<{ walletId: string; address: string }>;
  signSolanaTransaction(walletId: string, txBase64: string): Promise<string>;
  getSolanaBalance(address: string): Promise<{ sol: bigint; usdc: bigint; usdt: bigint }>;
  destroyWallet(walletId: string): Promise<void>;
}

const BASE58 =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const randomBase58 = (length: number): string => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE58[bytes[i]! % BASE58.length];
  }
  return out;
};

const stubAddresses = new Map<string, string>();

export const stubPrivyService: PrivyService = {
  async createEphemeralSolanaWallet(swapId) {
    const address = randomBase58(43);
    const walletId = `stub_w_${crypto.randomBytes(8).toString('hex')}`;
    stubAddresses.set(walletId, address);
    void swapId;
    return { walletId, address };
  },
  async signSolanaTransaction(_walletId, _txBase64) {
    return randomBase58(87);
  },
  async getSolanaBalance(_address) {
    return { sol: 0n, usdc: 0n, usdt: 0n };
  },
  async destroyWallet(walletId) {
    stubAddresses.delete(walletId);
  },
};
