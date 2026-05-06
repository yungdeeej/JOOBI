import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  ADMIN_API_TOKEN: z.string().min(8).default('dev-admin-token-change-me'),
  USE_STUBS: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),

  PRIVY_APP_ID: z.string().optional(),
  PRIVY_APP_SECRET: z.string().optional(),
  PRIVY_AUTHORIZATION_KEY_ID: z.string().optional(),
  PRIVY_AUTHORIZATION_KEY: z.string().optional(),
  PRIVY_WALLET_POLICY_ID: z.string().optional(),

  SYMBIOSIS_API_BASE_URL: z.string().url().default('https://api.symbiosis.finance/crosschain/v1'),
  SYMBIOSIS_PARTNER_ID: z.string().default('joobiswap'),
  SYMBIOSIS_PARTNER_FEE_COLLECTOR: z.string().optional(),

  HELIUS_API_KEY: z.string().optional(),
  HELIUS_RPC_URL: z.string().optional(),
  HELIUS_WEBHOOK_ID: z.string().optional(),
  HELIUS_WEBHOOK_SECRET: z.string().optional(),
  HELIUS_WEBHOOK_AUTH_HEADER: z.string().optional(),

  TONCENTER_API_KEY: z.string().optional(),
  TONCENTER_BASE_URL: z.string().url().default('https://toncenter.com/api/v3'),
  TONAPI_KEY: z.string().optional(),
  TONAPI_BASE_URL: z.string().url().default('https://tonapi.io/v2'),

  STONFI_ROUTER_ADDRESS: z.string().default('EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt'),
  STONFI_API_BASE_URL: z.string().url().default('https://api.ston.fi/v1'),
  JOOBI_JETTON_MASTER: z.string().default('EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL'),

  GEO_BLOCK_COUNTRIES: z.string().default('US,IR,KP,SY,CU'),
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(1000).default(100),
  QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  DEPOSIT_TTL_SECONDS: z.coerce.number().int().positive().default(1200),
  MIN_SWAP_USD: z.coerce.number().positive().default(10),
  MAX_SWAP_USD: z.coerce.number().positive().default(5000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

export const geoBlockedCountries = new Set(
  env.GEO_BLOCK_COUNTRIES.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
);
