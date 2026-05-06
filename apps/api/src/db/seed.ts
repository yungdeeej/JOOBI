import { db, sqlClient } from './client.js';
import { supportedTokens } from './schema.js';
import { logger } from '../lib/logger.js';

const SEED_TOKENS = [
  { symbol: 'SOL', chain: 'solana', contractAddress: null, decimals: 9 },
  {
    symbol: 'USDC_SOL',
    chain: 'solana',
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  {
    symbol: 'USDT_SOL',
    chain: 'solana',
    contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KConKy4G6gS9X9TzYHBh',
    decimals: 6,
  },
  { symbol: 'TON', chain: 'ton', contractAddress: null, decimals: 9 },
  {
    symbol: 'JOOBI',
    chain: 'ton',
    contractAddress: 'EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL',
    decimals: 9,
  },
];

const run = async () => {
  for (const token of SEED_TOKENS) {
    await db
      .insert(supportedTokens)
      .values(token)
      .onConflictDoNothing({ target: supportedTokens.symbol });
  }
  logger.info({ count: SEED_TOKENS.length }, 'seeded supported_tokens');
  await sqlClient.end();
};

run().catch((err) => {
  logger.error({ err }, 'seed failed');
  process.exit(1);
});
