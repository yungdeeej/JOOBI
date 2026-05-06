import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  jsonb,
  boolean,
  serial,
  bigserial,
  index,
  unique,
} from 'drizzle-orm/pg-core';

export const swapStateEnum = pgEnum('swap_state', [
  'WAITING_DEPOSIT',
  'DEPOSIT_DETECTED',
  'DEPOSIT_CONFIRMED',
  'BRIDGING',
  'BRIDGE_CONFIRMED',
  'SWAPPING_TO_DESTINATION',
  'DESTINATION_SWAP_CONFIRMED',
  'SENDING_TO_USER',
  'COMPLETED',
  'EXPIRED',
  'REFUND_REQUIRED',
  'REFUND_IN_PROGRESS',
  'REFUNDED',
  'MANUAL_REVIEW',
  'FAILED',
]);

export const swaps = pgTable(
  'swaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull().unique(),

    sourceToken: text('source_token').notNull(),
    sourceAmount: numeric('source_amount', { precision: 30, scale: 9 }).notNull(),
    destinationToken: text('destination_token').notNull(),
    destinationAddress: text('destination_address').notNull(),
    slippageBps: integer('slippage_bps').notNull().default(200),

    depositAddress: text('deposit_address').notNull().unique(),
    privyWalletId: text('privy_wallet_id').notNull(),

    quotedDestinationAmount: numeric('quoted_destination_amount', { precision: 30, scale: 9 }),
    minDestinationAmount: numeric('min_destination_amount', { precision: 30, scale: 9 }),
    symbiosisQuoteId: text('symbiosis_quote_id'),
    quotedAt: timestamp('quoted_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    state: swapStateEnum('state').notNull().default('WAITING_DEPOSIT'),

    depositTxHash: text('deposit_tx_hash'),
    bridgeTxHashSource: text('bridge_tx_hash_source'),
    bridgeTxHashDestination: text('bridge_tx_hash_destination'),
    destinationSwapTxHash: text('destination_swap_tx_hash'),
    payoutTxHash: text('payout_tx_hash'),
    refundTxHash: text('refund_tx_hash'),

    actualReceivedAmount: numeric('actual_received_amount', { precision: 30, scale: 9 }),
    actualBridgedAmount: numeric('actual_bridged_amount', { precision: 30, scale: 9 }),
    actualDestinationAmount: numeric('actual_destination_amount', { precision: 30, scale: 9 }),

    platformFeeBps: integer('platform_fee_bps').notNull().default(100),
    platformFeeAmount: numeric('platform_fee_amount', { precision: 30, scale: 9 }),
    bridgeFeeAmount: numeric('bridge_fee_amount', { precision: 30, scale: 9 }),

    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    clientRequestId: text('client_request_id').unique(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stateIdx: index('idx_swaps_state').on(t.state),
    depositAddressIdx: index('idx_swaps_deposit_address').on(t.depositAddress),
    publicIdIdx: index('idx_swaps_public_id').on(t.publicId),
    createdAtIdx: index('idx_swaps_created_at').on(t.createdAt),
  }),
);

export const swapEvents = pgTable(
  'swap_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    swapId: uuid('swap_id')
      .notNull()
      .references(() => swaps.id),
    fromState: swapStateEnum('from_state'),
    toState: swapStateEnum('to_state').notNull(),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    swapIdIdx: index('idx_swap_events_swap_id').on(t.swapId, t.createdAt),
  }),
);

export const supportedTokens = pgTable('supported_tokens', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  chain: text('chain').notNull(),
  contractAddress: text('contract_address'),
  decimals: integer('decimals').notNull(),
  minSwapUsd: numeric('min_swap_usd', { precision: 12, scale: 2 }).notNull().default('10'),
  maxSwapUsd: numeric('max_swap_usd', { precision: 12, scale: 2 }).notNull().default('5000'),
  isActive: boolean('is_active').notNull().default(true),
});

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    payloadHash: text('payload_hash'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    receivedAtIdx: index('idx_webhook_events_received_at').on(t.receivedAt),
    uniq: unique('webhook_events_unique').on(t.provider, t.externalId),
  }),
);

export type Swap = typeof swaps.$inferSelect;
export type NewSwap = typeof swaps.$inferInsert;
export type SwapEvent = typeof swapEvents.$inferSelect;
export type SupportedToken = typeof supportedTokens.$inferSelect;
