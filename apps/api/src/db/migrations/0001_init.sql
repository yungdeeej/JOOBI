CREATE TYPE swap_state AS ENUM (
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
  'FAILED'
);

CREATE TABLE IF NOT EXISTS supported_tokens (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL,
  contract_address TEXT,
  decimals INTEGER NOT NULL,
  min_swap_usd NUMERIC(12, 2) NOT NULL DEFAULT 10,
  max_swap_usd NUMERIC(12, 2) NOT NULL DEFAULT 5000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE,

  source_token TEXT NOT NULL,
  source_amount NUMERIC(30, 9) NOT NULL,
  destination_token TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  slippage_bps INTEGER NOT NULL DEFAULT 200,

  deposit_address TEXT NOT NULL UNIQUE,
  privy_wallet_id TEXT NOT NULL,

  quoted_destination_amount NUMERIC(30, 9),
  min_destination_amount NUMERIC(30, 9),
  symbiosis_quote_id TEXT,
  quoted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,

  state swap_state NOT NULL DEFAULT 'WAITING_DEPOSIT',

  deposit_tx_hash TEXT,
  bridge_tx_hash_source TEXT,
  bridge_tx_hash_destination TEXT,
  destination_swap_tx_hash TEXT,
  payout_tx_hash TEXT,
  refund_tx_hash TEXT,

  actual_received_amount NUMERIC(30, 9),
  actual_bridged_amount NUMERIC(30, 9),
  actual_destination_amount NUMERIC(30, 9),

  platform_fee_bps INTEGER NOT NULL DEFAULT 100,
  platform_fee_amount NUMERIC(30, 9),
  bridge_fee_amount NUMERIC(30, 9),

  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  client_request_id TEXT UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swaps_state ON swaps(state);
CREATE INDEX IF NOT EXISTS idx_swaps_deposit_address ON swaps(deposit_address);
CREATE INDEX IF NOT EXISTS idx_swaps_public_id ON swaps(public_id);
CREATE INDEX IF NOT EXISTS idx_swaps_created_at ON swaps(created_at);

CREATE TABLE IF NOT EXISTS swap_events (
  id BIGSERIAL PRIMARY KEY,
  swap_id UUID NOT NULL REFERENCES swaps(id),
  from_state swap_state,
  to_state swap_state NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swap_events_swap_id ON swap_events(swap_id, created_at);
