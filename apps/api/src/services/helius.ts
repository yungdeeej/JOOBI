import crypto from 'node:crypto';
import { env } from '../lib/env.js';

export interface HeliusService {
  registerWebhookAddress(address: string): Promise<void>;
  unregisterWebhookAddress(address: string): Promise<void>;
  verifyWebhookAuth(headerValue: string | undefined): boolean;
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
}

export const stubHeliusService: HeliusService = {
  async registerWebhookAddress(_address) {},
  async unregisterWebhookAddress(_address) {},
  verifyWebhookAuth(headerValue) {
    if (!env.HELIUS_WEBHOOK_AUTH_HEADER) return true;
    return headerValue === env.HELIUS_WEBHOOK_AUTH_HEADER;
  },
  verifyWebhookSignature(rawBody, signature) {
    if (!env.HELIUS_WEBHOOK_SECRET) return true;
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', env.HELIUS_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  },
};
