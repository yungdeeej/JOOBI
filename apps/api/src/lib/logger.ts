import pino from 'pino';
import { env } from './env.js';

const scrubAddress = (value: string): string =>
  value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;

export const redactAddress = scrubAddress;

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      '*.privateKey',
      'PRIVY_APP_SECRET',
      'PRIVY_AUTHORIZATION_KEY',
      'HELIUS_API_KEY',
      'HELIUS_WEBHOOK_SECRET',
      'TONCENTER_API_KEY',
      'TONAPI_KEY',
    ],
    censor: '[redacted]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});
