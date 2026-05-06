# JoobiSwap — Complete Build Specification

**Project:** Cross-chain swap service: SOL/USDC-SOL/USDT-SOL → TON/JOOBI
**Target stack:** Replit + Node.js 20 + Postgres + Redis
**Architecture pattern:** SimpleSwap-style (no wallet connect) with ephemeral per-swap deposit addresses
**Build time target:** 2–3 weeks
**Deployment target:** Replit Deployments (or DigitalOcean App Platform)

---

## 1. Product Overview

A SimpleSwap/Houdini-style cross-chain swap web app. Users land on a one-page form, enter swap details, get a deposit address, send their SOL/USDC/USDT, and receive TON or JOOBI at their TON address. **No wallet connection required.**

### Core User Flow

1. User lands on homepage with the swap form
2. User selects: source token (SOL / USDC-SOL / USDT-SOL), source amount, destination token (TON / JOOBI)
3. Live quote appears showing destination amount, fees, ETA, slippage
4. User enters their TON destination address (validated)
5. User clicks "Create Swap"
6. App displays: unique Solana deposit address, exact amount to send, QR code, 20-min countdown
7. User sends from their own wallet/exchange
8. App auto-detects deposit, executes the route, sends to user's TON address
9. Status page polls and updates through stages
10. On completion, show TON destination tx hash with explorer link

### State Machine

```
WAITING_DEPOSIT
  → DEPOSIT_DETECTED
  → DEPOSIT_CONFIRMED
  → BRIDGING
  → BRIDGE_CONFIRMED
  → SWAPPING_TO_DESTINATION  (skipped if destination is TON)
  → DESTINATION_SWAP_CONFIRMED
  → SENDING_TO_USER
  → COMPLETED
```

Failure branches: `EXPIRED`, `REFUND_REQUIRED → REFUND_IN_PROGRESS → REFUNDED`, `MANUAL_REVIEW`, `FAILED`.

---

## 2. Tech Stack (Locked)

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | pnpm workspaces | `apps/web`, `apps/api`, `packages/shared` |
| Frontend | Next.js 14 App Router, React 18, Tailwind, shadcn/ui, TanStack Query | Mobile-first |
| Backend | Node.js 20, Express 4, Zod, Pino | TypeScript strict |
| Database | PostgreSQL 15 + Drizzle ORM | |
| Queue | BullMQ on Redis 7 | State machine workers |
| Wallet management | **Privy server wallets** | Ephemeral per-swap addresses |
| Cross-chain bridge | **Symbiosis API** (public, no auth) | SOL/USDC/USDT → TON |
| TON DEX | **STON.fi SDK v2** | TON → JOOBI |
| Solana RPC + deposit detection | **Helius** | RPC + webhooks |
| TON RPC | **TonCenter** + **TonAPI** | Both for redundancy |
| Hosting | Replit Deployments (or DigitalOcean App Platform) | |

---

## 3. Token Configuration

Seed `supported_tokens` table with these 5 tokens:

| Symbol | Chain | Contract Address | Decimals |
|---|---|---|---|
| SOL | solana | (native) | 9 |
| USDC_SOL | solana | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| USDT_SOL | solana | `Es9vMFrzaCERmJfrF4H2FYD4KConKy4G6gS9X9TzYHBh` | 6 |
| TON | ton | (native) | 9 |
| JOOBI | ton | `EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL` | 9 |

### JOOBI Token Specifics

- **Jetton master:** `EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL`
- **Max supply:** 100,000,000 JOOBI
- **Verification:** NOT on TON whitelist (wallets show warning — disclose in UI)
- **Pool location:** STON.fi (verify exact pool address via STON.fi API at runtime)
- **Liquidity at audit time:** ~$39K (thin — slippage cap is critical)
- **Important:** Solana JOOBI (`3gFD6JcB1XUjuCG9RCoAjkRgDuceFQ7UQTxtLXzzpump`) is an **unrelated token**. UI must disambiguate clearly.

---

## 4. Swap Limits & Slippage

| Setting | Value |
|---|---|
| Min swap | $10 USD equivalent |
| Max swap | $5,000 USD equivalent |
| Default slippage | 2% (200 bps) |
| Max slippage | 10% (1000 bps) |
| Quote TTL | 60 seconds |
| Deposit window | 20 minutes |

### Slippage UI Rules

- **<1%:** Green badge
- **1–3%:** Yellow badge
- **3–5%:** Orange badge
- **>5%:** Red badge + user must check "I understand I will lose ~X%" confirmation box before "Create Swap" enables

### Rate Limits

- 10 quotes/min/IP
- 5 swaps/hour/IP
- Geo-block: US, IR, KP, SY, CU (using `geoip-lite`)

---

## 5. Service Credentials Reference

> ⚠️ **NEVER paste actual credential values in this document, in code comments, in chat, or in any version-controlled file.** Only fill them in your local `.env` (in `.gitignore`) or in Replit Secrets.

### 5.1 Privy (Solana Wallet Management)

Status: ✅ Configured

| Variable | Purpose | Source |
|---|---|---|
| `PRIVY_APP_ID` | App identifier | Privy Dashboard → Configuration → App settings → Basics |
| `PRIVY_APP_SECRET` | Backend auth | Privy Dashboard → Basics → "+ New secret" (only shown once at creation) |
| `PRIVY_AUTHORIZATION_KEY_ID` | Public key ID for server wallet auth | Privy Dashboard → Wallet infrastructure → Authorization |
| `PRIVY_AUTHORIZATION_KEY` | Private key for signing API requests | Same page; download immediately at creation |
| `PRIVY_WALLET_POLICY_ID` | Restricts what server wallets can sign | Privy Dashboard → Wallet infrastructure → Policies |

**Wallet policy contents:** `swap-deposit-policy` allowing `signTransaction` with Program IDs in list:

```
11111111111111111111111111111111
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
ATokenGPvbdGVwd1FFwGAwGfowDqo9XyqgYcuJD6sxzQ
ComputeBudget111111111111111111111111111111
JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4
```

Action: `Allow`. May need to add Symbiosis Solana program IDs after first integration test (will surface as policy errors).

### 5.2 Symbiosis (Cross-Chain Bridge)

Status: ✅ No signup required — public API

| Variable | Value |
|---|---|
| `SYMBIOSIS_API_BASE_URL` | `https://api.symbiosis.finance/crosschain/v1` |
| `SYMBIOSIS_PARTNER_ID` | `joobiswap` (custom string for analytics) |
| `SYMBIOSIS_PARTNER_FEE_COLLECTOR` | (empty for v1 — deploy contract in v1.5 if collecting platform fees on top) |

**Solana chain ID for Symbiosis:** `7565164`
**TON chain ID for Symbiosis:** `85918`

**Docs:** https://docs.symbiosis.finance/developer-tools/symbiosis-api
**Swagger:** https://api.symbiosis.finance/crosschain/docs

### 5.3 Helius (Solana RPC + Webhooks)

Status: ✅ Configured

| Variable | Purpose | Source |
|---|---|---|
| `HELIUS_API_KEY` | RPC + Webhook auth | helius.dev dashboard → API Keys |
| `HELIUS_RPC_URL` | Full RPC URL | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` |
| `HELIUS_WEBHOOK_SECRET` | Verify webhook authenticity | Generated locally: `openssl rand -hex 32` |
| `HELIUS_WEBHOOK_AUTH_HEADER` | Custom auth header value | Generated locally: `openssl rand -hex 32` |
| `HELIUS_WEBHOOK_ID` | Set after webhook creation at deployment | Empty until backend is deployed |

**Webhook config (do at deployment, not during local dev):**

- URL: `https://your-deployed-domain.com/api/webhooks/helius`
- Type: `Enhanced`
- Transaction types: `TRANSFER`, `TOKEN_TRANSFER`
- Auth header: `X-Helius-Auth: <HELIUS_WEBHOOK_AUTH_HEADER>`
- Account addresses: managed dynamically by backend via Helius API as ephemeral wallets are created

### 5.4 TonCenter (TON RPC)

Status: ✅ Configured

| Variable | Purpose | Source |
|---|---|---|
| `TONCENTER_API_KEY` | TON mainnet RPC auth | Telegram bot `@tonapibot` → `/start` → `/keys` |
| `TONCENTER_BASE_URL` | API endpoint | `https://toncenter.com/api/v3` |

### 5.5 TonAPI (Recommended Secondary TON Provider)

Status: 🔲 Optional — can add later

| Variable | Purpose | Source |
|---|---|---|
| `TONAPI_KEY` | Better-DX TON queries | tonconsole.com → Create app → Generate token |
| `TONAPI_BASE_URL` | API endpoint | `https://tonapi.io/v2` |

**Note:** Code should abstract both providers behind a single `TonClient` interface so either can serve any query. TonAPI for jetton metadata and rich queries; TonCenter for raw RPC fallback.

### 5.6 STON.fi (TON DEX)

Status: ✅ No signup required

| Variable | Value |
|---|---|
| `STONFI_ROUTER_ADDRESS` | `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` (V2 router) |
| `STONFI_API_BASE_URL` | `https://api.ston.fi/v1` |
| `JOOBI_JETTON_MASTER` | `EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL` |

**SDK:** `@ston-fi/sdk` (npm)

---

## 6. Complete `.env.example`

```bash
# === Database ===
DATABASE_URL=postgresql://localhost:5432/joobiswap
REDIS_URL=redis://localhost:6379

# === Privy (Solana wallet management) ===
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTHORIZATION_KEY_ID=
PRIVY_AUTHORIZATION_KEY=
PRIVY_WALLET_POLICY_ID=

# === Symbiosis (cross-chain bridge — no auth) ===
SYMBIOSIS_API_BASE_URL=https://api.symbiosis.finance/crosschain/v1
SYMBIOSIS_PARTNER_ID=joobiswap
SYMBIOSIS_PARTNER_FEE_COLLECTOR=

# === Helius (Solana RPC + webhooks) ===
HELIUS_API_KEY=
HELIUS_RPC_URL=
HELIUS_WEBHOOK_ID=
HELIUS_WEBHOOK_SECRET=
HELIUS_WEBHOOK_AUTH_HEADER=

# === TON (RPC + jetton operations) ===
TONCENTER_API_KEY=
TONCENTER_BASE_URL=https://toncenter.com/api/v3
TONAPI_KEY=
TONAPI_BASE_URL=https://tonapi.io/v2

# === STON.fi (TON DEX — no auth) ===
STONFI_ROUTER_ADDRESS=EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt
STONFI_API_BASE_URL=https://api.ston.fi/v1
JOOBI_JETTON_MASTER=EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL

# === App ===
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
ADMIN_API_TOKEN=
NODE_ENV=development

# === Compliance & limits ===
GEO_BLOCK_COUNTRIES=US,IR,KP,SY,CU
PLATFORM_FEE_BPS=100
QUOTE_TTL_SECONDS=60
DEPOSIT_TTL_SECONDS=1200
MIN_SWAP_USD=10
MAX_SWAP_USD=5000
```

Generate `ADMIN_API_TOKEN`, `HELIUS_WEBHOOK_SECRET`, `HELIUS_WEBHOOK_AUTH_HEADER` with:
```bash
openssl rand -hex 32
```

---

## 7. Repository Structure

```
joobiswap/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing + swap form
│   │   │   ├── swap/[publicId]/page.tsx
│   │   │   ├── api/                  # Next API proxies
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── SwapForm.tsx
│   │   │   ├── QuoteDisplay.tsx
│   │   │   ├── DepositInstructions.tsx
│   │   │   ├── StatusTimeline.tsx
│   │   │   ├── SlippageWarning.tsx
│   │   │   └── ui/                   # shadcn
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── validation.ts
│   │   └── package.json
│   └── api/                          # Express backend
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   │   ├── quotes.ts
│       │   │   ├── swaps.ts
│       │   │   ├── webhooks.ts
│       │   │   └── admin.ts
│       │   ├── services/
│       │   │   ├── privy.ts          # Ephemeral wallet (STUB → real in P2)
│       │   │   ├── symbiosis.ts      # Bridge (STUB → real in P2)
│       │   │   ├── stonfi.ts         # TON DEX (STUB → real in P2)
│       │   │   ├── helius.ts         # Solana monitoring
│       │   │   ├── ton-client.ts     # TonCenter + TonAPI abstraction
│       │   │   ├── price.ts          # USD pricing for limits
│       │   │   └── quote.ts          # Quote engine
│       │   ├── workers/
│       │   │   ├── orchestrator.ts   # State machine
│       │   │   └── timeout-monitor.ts
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   ├── migrations/
│       │   │   ├── seed.ts
│       │   │   └── client.ts
│       │   └── lib/
│       │       ├── logger.ts
│       │       ├── errors.ts
│       │       └── env.ts
│       └── package.json
├── packages/
│   └── shared/
│       └── src/
│           ├── types.ts
│           └── schemas.ts
├── docker-compose.yml                # Local Postgres + Redis
├── .env.example
├── .gitignore
├── package.json                      # Root + pnpm workspaces
├── pnpm-workspace.yaml
├── turbo.json                        # Optional: Turborepo for parallel builds
├── tsconfig.base.json
└── README.md
```

---

## 8. Database Schema (Drizzle)

```typescript
// apps/api/src/db/schema.ts
import {
  pgTable, pgEnum, uuid, text, numeric, integer, timestamp,
  jsonb, boolean, serial, bigserial, index,
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

export const swaps = pgTable('swaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: text('public_id').notNull().unique(),  // 'swp_' + 12-char nanoid

  // User input
  sourceToken: text('source_token').notNull(),
  sourceAmount: numeric('source_amount', { precision: 30, scale: 9 }).notNull(),
  destinationToken: text('destination_token').notNull(),
  destinationAddress: text('destination_address').notNull(),
  slippageBps: integer('slippage_bps').notNull().default(200),

  // Generated
  depositAddress: text('deposit_address').notNull().unique(),
  privyWalletId: text('privy_wallet_id').notNull(),

  // Quote (locked at swap creation)
  quotedDestinationAmount: numeric('quoted_destination_amount', { precision: 30, scale: 9 }),
  minDestinationAmount: numeric('min_destination_amount', { precision: 30, scale: 9 }),
  symbiosisQuoteId: text('symbiosis_quote_id'),
  quotedAt: timestamp('quoted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  // State
  state: swapStateEnum('state').notNull().default('WAITING_DEPOSIT'),

  // Tx hashes
  depositTxHash: text('deposit_tx_hash'),
  bridgeTxHashSource: text('bridge_tx_hash_source'),
  bridgeTxHashDestination: text('bridge_tx_hash_destination'),
  destinationSwapTxHash: text('destination_swap_tx_hash'),
  payoutTxHash: text('payout_tx_hash'),
  refundTxHash: text('refund_tx_hash'),

  // Actual amounts
  actualReceivedAmount: numeric('actual_received_amount', { precision: 30, scale: 9 }),
  actualBridgedAmount: numeric('actual_bridged_amount', { precision: 30, scale: 9 }),
  actualDestinationAmount: numeric('actual_destination_amount', { precision: 30, scale: 9 }),

  // Fees
  platformFeeBps: integer('platform_fee_bps').notNull().default(100),
  platformFeeAmount: numeric('platform_fee_amount', { precision: 30, scale: 9 }),
  bridgeFeeAmount: numeric('bridge_fee_amount', { precision: 30, scale: 9 }),

  // Tracking
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  stateIdx: index('idx_swaps_state').on(t.state),
  depositAddressIdx: index('idx_swaps_deposit_address').on(t.depositAddress),
  publicIdIdx: index('idx_swaps_public_id').on(t.publicId),
  createdAtIdx: index('idx_swaps_created_at').on(t.createdAt),
}));

export const swapEvents = pgTable('swap_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  swapId: uuid('swap_id').notNull().references(() => swaps.id),
  fromState: swapStateEnum('from_state'),
  toState: swapStateEnum('to_state').notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  swapIdIdx: index('idx_swap_events_swap_id').on(t.swapId, t.createdAt),
}));

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
```

---

## 9. API Endpoints

### `POST /api/quotes`
Get a quote without creating a swap. Used for live UI updates.

**Request:**
```json
{
  "sourceToken": "SOL",
  "sourceAmount": "1.5",
  "destinationToken": "JOOBI"
}
```

**Response:**
```json
{
  "quoteId": "qte_abc123",
  "estimatedDestinationAmount": "12345.67",
  "minDestinationAmount": "12098.76",
  "platformFeeAmount": "0.015",
  "bridgeFeeAmount": "0.002",
  "estimatedTotalSeconds": 90,
  "priceImpactPercent": 1.2,
  "expiresAt": "2026-..."
}
```

### `POST /api/swaps`
Creates a swap, generates ephemeral Privy wallet, locks quote, returns deposit instructions.

**Request:**
```json
{
  "sourceToken": "SOL",
  "sourceAmount": "1.5",
  "destinationToken": "JOOBI",
  "destinationAddress": "UQ...",
  "slippageBps": 200,
  "clientRequestId": "uuid-from-frontend"
}
```

**Response:**
```json
{
  "publicId": "swp_abc123",
  "depositAddress": "...",
  "exactDepositAmount": "1.5",
  "expiresAt": "...",
  "statusUrl": "/swap/swp_abc123"
}
```

### `GET /api/swaps/:publicId`
Returns full swap state for status page polling. Frontend polls every 3 seconds.

### `POST /api/webhooks/helius`
Helius webhook for deposit detection. Verifies signature with `HELIUS_WEBHOOK_SECRET` and `HELIUS_WEBHOOK_AUTH_HEADER`.

### `POST /api/admin/swaps/:id/simulate-deposit` (DEV ONLY)
For testing the state machine end-to-end with stubs. Disabled when `NODE_ENV === 'production'`.

### `POST /api/admin/swaps/:id/refund` (auth via `ADMIN_API_TOKEN` header)
Manual refund trigger.

### `POST /api/admin/swaps/:id/retry` (auth)
Retry a failed step.

---

## 10. Service Interfaces (Stubs First)

Each service has a TypeScript interface. Stubs return realistic mock data so the full flow works **without external API keys** during initial scaffold testing.

### `services/privy.ts`

```typescript
export interface PrivyService {
  createEphemeralSolanaWallet(swapId: string): Promise<{
    walletId: string;
    address: string;
  }>;
  signSolanaTransaction(walletId: string, txBase64: string): Promise<string>;
  getSolanaBalance(address: string): Promise<{
    sol: bigint;
    usdc: bigint;
    usdt: bigint;
  }>;
  destroyWallet(walletId: string): Promise<void>;
}
```

**Stub behavior:** generates valid Solana addresses with `Keypair.generate()` (keypair discarded), returns fake walletId, returns fake balance, fake signature.

### `services/symbiosis.ts`

```typescript
export interface SymbiosisService {
  getQuote(params: {
    fromChainId: number;        // 7565164 = Solana mainnet
    toChainId: number;          // 85918 = TON mainnet
    fromTokenAddress: string;   // mint or '' for native SOL
    toTokenAddress: string;     // jetton master or '' for native TON
    amount: string;             // smallest units
    fromAddress: string;
    toAddress: string;
    slippage: number;           // 200 = 2%
    partnerId: string;
  }): Promise<{
    tokenAmountOut: string;
    tokenAmountOutMin: string;
    estimatedTimeSeconds: number;
    priceImpactPercent: number;
    feeAmount: string;
    tx: { data: string; to: string; value: string };
  }>;

  trackSwap(params: {
    chainId: number;
    txHash: string;
  }): Promise<{
    status: 'pending' | 'success' | 'failed' | 'stucked';
    destinationTxHash?: string;
    outputAmount?: string;
  }>;

  getStuckedSwaps(address: string): Promise<Array<{
    transactionHash: string;
    fromChainId: number;
    toChainId: number;
    type: 'burn' | 'synthesize';
  }>>;
}
```

**Stub conversion rates (hardcoded for realism):**
- 1 SOL = 25 TON
- 1 USDC = 0.16 TON
- 1 USDT = 0.16 TON
- Subtract 0.5% bridge fee, return realistic priceImpact (0.1–0.8%), estimatedSeconds 60–90.

### `services/stonfi.ts`

```typescript
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
```

**Stub rate:** 1 TON = 270 JOOBI, with realistic price impact based on swap size (>$500 → >2% impact, scales).

---

## 11. State Machine Worker Flow

`apps/api/src/workers/orchestrator.ts` — BullMQ worker. Each transition logs to `swap_events`. Uses stubs end-to-end so the full flow works without external services.

```
WAITING_DEPOSIT
  ↓ (deposit webhook fires OR simulate-deposit endpoint called)
DEPOSIT_DETECTED
  ↓ (wait 2s in stub mode for confirmations)
DEPOSIT_CONFIRMED
  ↓ (call symbiosis.getQuote → execute via Privy-signed tx)
BRIDGING
  ↓ (poll symbiosis.trackSwap, advances after ~5s in stub)
BRIDGE_CONFIRMED
  ↓ (if destination is TON, skip to SENDING_TO_USER)
  ↓ (if destination is JOOBI, call stonfi.buildSwapTx)
SWAPPING_TO_DESTINATION
  ↓ (3s in stub)
DESTINATION_SWAP_CONFIRMED
  ↓
SENDING_TO_USER
  ↓ (2s in stub)
COMPLETED
```

**Failure paths:**
- Any state stuck >10 min → `MANUAL_REVIEW`
- Any explicit failure → `REFUND_REQUIRED` (refund logic in Prompt 3)

---

## 12. Frontend Requirements

### Landing Page `/`
- Hero: "Swap SOL → TON & JOOBI in under 2 minutes"
- Tagline: "No wallet connection needed. Send from anywhere."
- Live swap form
- Recent swaps ticker (anonymized: "0.5 SOL → 4,521 JOOBI · 2 min ago")
- Trust elements: "Funds touch our system for under 90 seconds", live count of total swaps completed
- FAQ: "What is JOOBI?", "How long does this take?", "What if my swap fails?", "What are the fees?"
- **Disambiguation notice:** "JOOBI on TON is unrelated to JOOBI on Solana. Verify contract: `EQB5jq...IJiaL`"
- Footer: terms, privacy, contact

### Swap Form
- Source token dropdown (SOL/USDC-SOL/USDT-SOL) with icons
- Amount input with USD equivalent shown
- Down arrow toggle
- Destination token dropdown (TON/JOOBI) with icons
- Computed destination amount (read-only)
- TON address input with paste button + checkmark when valid
- Live quote box (updates 500ms after typing stops):
  - "You'll receive: ~12,345.67 JOOBI"
  - "Minimum received: 12,098.76 JOOBI"
  - "Network fee: 0.002 SOL"
  - "Platform fee: 1%"
  - "Estimated time: ~90 seconds"
  - Price impact: colored badge per slippage rules
- Slippage settings (collapsed by default): 1% / 2% / 3% / Custom
- "Create Swap" button — disabled until valid

### Status Page `/swap/[publicId]`
- Big status indicator with current state in human terms
- Visual timeline (7 steps with checkmarks/spinner/checkmark)
- Deposit panel (visible until `DEPOSIT_DETECTED`):
  - QR code
  - Copy-address button (full address shown, never truncated visibly)
  - Exact amount with copy button
  - Countdown timer (mm:ss)
  - Network warning: "⚠ Send only on Solana network. Other networks = lost funds."
- Transaction details (collapsible) — all tx hashes with explorer links
- Auto-polling every 3s via TanStack Query
- Confetti animation on `COMPLETED`
- Support contact link in footer

### Mobile-First
All flows work cleanly at 375px width. Test specifically: paste address, scan QR with another phone, copy address.

---

## 13. Security Requirements (Non-Negotiable)

1. **No private keys in code or env vars.** All Solana signing through Privy SDK.
2. **Webhook signature verification.** Helius webhooks verified before processing.
3. **Idempotent webhooks** via `clientRequestId` and dedup table.
4. **Rate limiting** via Redis-backed Express middleware.
5. **All input validated** through Zod schemas.
6. **CORS lockdown** — backend accepts only configured frontend origin.
7. **Secrets validated via Zod on boot** — fail fast if any missing.
8. **Drizzle ORM only** — no raw SQL.
9. **PII scrubbed in logs** — strip TON/SOL addresses to first 6 + last 4 chars.
10. **Strict CSP headers** on Next.js.

---

## 14. Build Plan: 5 Prompts

This is the planned sequence of Claude Code prompts. **Do them in order.**

### Prompt 1 — Scaffold (this document covers it)
Builds: monorepo, schema, all routes, all stubs, full state machine worker, complete frontend. Acceptance: full E2E flow works with stubs (no external API keys needed).

### Prompt 2 — Real Integrations
Replace stubs with real Privy + Symbiosis + STON.fi calls.

```
Replace the stubbed Privy, Symbiosis, and STON.fi services with real implementations:

1. Privy: use @privy-io/server-auth to create Solana wallets bound to PRIVY_WALLET_POLICY_ID.
   Sign transactions via Privy's signTransaction API. Implement getSolanaBalance using
   Helius RPC. Implement destroyWallet by removing the wallet from Privy.

2. Symbiosis: integrate via REST API at https://api.symbiosis.finance/crosschain/v1.
   - getQuote: POST /v1/swap with { tokenAmountIn, tokenOut, from, to, slippage, partnerId }
   - trackSwap: GET /v1/tx/{chainId}/{txHash}
   - getStuckedSwaps: GET /v1/stucked/{address}
   Use Solana chain ID 7565164, TON chain ID 85918.

3. STON.fi: use @ston-fi/sdk v2 with RouterV2 + PoolV2.
   - getJoobiQuote: query JOOBI/TON pool via JOOBI_JETTON_MASTER
   - buildSwapTx: build swap message via Router.getSwapJettonToJettonTxParams or
     getSwapTonToJettonTxParams depending on input

Maintain all stub interfaces — only change implementations. Add integration tests using
testnet where possible. Add config flag USE_STUBS=true to allow falling back to stubs.
```

### Prompt 3 — Refund Engine
Implements full refund flow: detect deposit-but-bridge-failure, convert back to SOL, refund. Add `REFUND_REQUIRED → REFUND_IN_PROGRESS → REFUNDED` transitions. Manual approval gate for refunds >$500.

### Prompt 4 — Admin Dashboard
Build `/admin` (auth via `ADMIN_API_TOKEN` header). Live swap monitor, individual swap inspector with manual actions, KPI dashboard, wallet balance attestation page (in-flight swap sum vs hot wallet balance — must always match).

### Prompt 5 — Production Hardening
Sentry, structured logging with correlation IDs, Telegram alert bot (stuck swaps, idle balance, daily summary), health check with deep checks, graceful shutdown, Prometheus metrics, OpenTelemetry, strict CSP, fingerprint-based rate limiting, CAPTCHA on rate-limit hit.

---

## 15. Acceptance Test (Run After Prompt 1 Completes)

After scaffolding, the following must work end-to-end with stubs:

```bash
pnpm install
docker-compose up -d                # local Postgres + Redis
pnpm db:migrate
pnpm db:seed
pnpm dev                            # starts both web (3000) + api (4000)
```

Then in browser:
1. Open `http://localhost:3000`
2. Fill: 1 SOL → JOOBI, valid TON address
3. Click "Create Swap"
4. See deposit address + QR code + countdown
5. Trigger fake deposit:
   ```bash
   curl -X POST http://localhost:4000/api/admin/swaps/<id>/simulate-deposit
   ```
6. Watch status page advance through every state in real-time over ~30 seconds
7. See `COMPLETED` with confetti and a fake destination tx hash

**If this E2E flow doesn't work with stubs, the scaffold is broken.**

---

## 16. Replit Deployment Notes

This project is designed to deploy to Replit cleanly. Specifics:

### Replit Configuration

1. **Create a new Repl** with Node.js 20 template (or Nix template if you prefer for Postgres/Redis)
2. **Add Postgres:** Replit's built-in database (or external like Neon/Supabase if you outgrow it)
3. **Add Redis:** Use Upstash Redis (free tier: 10K commands/day) — Replit doesn't have managed Redis
4. **Configure secrets:** All env vars from `.env.example` go in Replit's **Secrets** tab (NOT in `.env` file in the repo)

### `.replit` Configuration

Create a `.replit` file at the repo root:

```toml
run = "pnpm dev"
entrypoint = "apps/api/src/index.ts"

[nix]
channel = "stable-23_11"

[deployment]
run = ["sh", "-c", "pnpm start"]
deploymentTarget = "cloudrun"
ignorePorts = false

[[ports]]
localPort = 3000
externalPort = 80

[[ports]]
localPort = 4000
externalPort = 4000
```

### `replit.nix` (if using Nix template)

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.postgresql_15
    pkgs.openssl
  ];
}
```

### Replit Deployments (Production)

Use **Reserved VM Deployments** (not Autoscale) for this app because:
- Persistent connections to Helius webhooks
- BullMQ workers need to run continuously
- Postgres connection pool benefits from a stable instance

Expected cost: ~$7-20/month for v1 traffic levels.

### Environment Variable Handover

When transitioning from local dev to Replit:
1. Copy each line from your local `.env` into Replit Secrets one by one
2. Update `APP_BASE_URL` and `API_BASE_URL` to your Replit URL: `https://joobiswap.username.repl.co`
3. Set `NODE_ENV=production`
4. Update Helius webhook URL to point to your Replit production URL

### Replit-Specific Pitfalls to Avoid

- Replit's filesystem is ephemeral on free tier — production data MUST be in Postgres, never in local files
- Replit's outbound HTTP has occasional rate limit quirks — implement retry with exponential backoff for all external API calls
- BullMQ requires Redis persistence — confirm Upstash plan has persistence enabled
- Don't use `localStorage` in the frontend — Claude Code may default to it; force in-memory state instead

---

## 17. JOOBI Audit Script (Run Before First Deploy)

Save as `scripts/audit-joobi.ts`. Run with `pnpm tsx scripts/audit-joobi.ts`.

```typescript
// scripts/audit-joobi.ts
const JOOBI_TON = 'EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL';
const TONAPI = 'https://tonapi.io/v2';
const STONFI = 'https://api.ston.fi/v1';
const DEXSCREENER = 'https://api.dexscreener.com/latest/dex';

interface CheckResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

const results: CheckResult[] = [];

const log = (name: string, status: CheckResult['status'], message: string) => {
  results.push({ name, status, message });
  const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
  console.log(`${icon} ${name}: ${message}`);
};

const safeFetch = async <T = any>(url: string): Promise<T | null> => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
};

(async () => {
  console.log('\n=== JOOBI Pre-Build Audit ===\n');

  // 1. Contract metadata
  const meta = await safeFetch<any>(`${TONAPI}/jettons/${JOOBI_TON}`);
  if (!meta) {
    log('contract', 'FAIL', 'Contract not found via TonAPI');
  } else {
    log('contract', 'PASS', `${meta.metadata?.name} (${meta.metadata?.symbol})`);
    log('holders',
      meta.holders_count >= 100 ? 'PASS' : 'WARN',
      `${meta.holders_count} holders`);
    log('mintable',
      meta.mintable === false ? 'PASS' : 'FAIL',
      `mintable: ${meta.mintable}`);
    log('verification',
      meta.verification === 'whitelist' ? 'PASS' : 'WARN',
      `whitelist: ${meta.verification}`);
  }

  // 2. STON.fi listing
  const asset = await safeFetch<any>(`${STONFI}/assets/${JOOBI_TON}`);
  if (!asset?.asset) {
    log('stonfi', 'FAIL', 'Not listed on STON.fi');
  } else {
    log('stonfi', 'PASS', `Listed on STON.fi`);
  }

  // 3. DexScreener stats
  const ds = await safeFetch<any>(`${DEXSCREENER}/tokens/${JOOBI_TON}`);
  const tonPair = ds?.pairs?.find((p: any) => p.chainId === 'ton');
  if (!tonPair) {
    log('dexscreener', 'FAIL', 'No TON pair found');
  } else {
    const liquidity = tonPair.liquidity?.usd || 0;
    log('liquidity',
      liquidity >= 25000 ? 'PASS' : liquidity >= 10000 ? 'WARN' : 'FAIL',
      `$${liquidity.toFixed(0)} liquidity`);

    // Slippage simulation
    console.log('\n  Slippage simulation:');
    [50, 100, 250, 500, 1000, 2500, 5000].forEach((usd) => {
      const slip = (usd / liquidity) * 100;
      console.log(`    $${usd.toString().padEnd(6)}  ${slip.toFixed(2)}%`);
    });
  }

  // Summary
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  console.log('\n=== Summary ===');
  console.log(`PASS: ${results.filter((r) => r.status === 'PASS').length} | WARN: ${warned} | FAIL: ${failed}`);

  if (failed > 0) {
    console.log('\n🚨 BUILD HALT — fix FAIL items before proceeding');
    process.exit(1);
  } else if (warned > 2) {
    console.log('\n⚠ Proceed with caution');
  } else {
    console.log('\n✓ Cleared to build');
  }
})();
```

---

## 18. Risk Register

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| JOOBI/TON liquidity drains mid-swap | High | Medium | Slippage cap + max swap size; quote re-validation at execution |
| LP tokens not burned (rug risk) | Critical | Unknown | **Verify manually via tonviewer before launch** |
| Symbiosis API downtime | High | Low | Implement fallback to direct DEX route on TON if available |
| Privy auth key leak | Critical | Low | Server-side only; rotate quarterly; env vars only |
| Helius webhook drop / replay | High | Medium | Idempotency via `clientRequestId`; deposit polling fallback |
| User sends wrong token to deposit address | High | High | Detect mismatch in `helius.ts`; hold for manual refund (charge gas) |
| Quote moves between display and execution | Medium | High | Quote expires in 60s; re-quote at execution; slippage cap |
| FINTRAC inquiry (Canada) | Medium | Medium | Add ToS, geo-block US/sanctioned, log all swaps; legal opinion within 30 days of launch |
| MEV sandwich on STON.fi swap | Medium | Medium | Use STON.fi slippage param; consider DeDust route comparison in v1.5 |
| User confuses TON JOOBI with Solana JOOBI | High | High | UI disambiguation everywhere — contract address visible on every screen |

---

## 19. Day 1 Manual Verifications (Before First Real Deploy)

These cannot be scripted — you do them by hand once.

1. **JOOBI LP lock status**
   - Open https://tonviewer.com/EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL
   - Find the JOOBI/TON pool on STON.fi
   - Inspect LP token holders
   - Confirm: LP tokens are burned (sent to `0:0...0`) OR locked in a verifiable contract
   - If deployer holds >20% of LP → **DO NOT LAUNCH** until liquidity is locked

2. **Symbiosis SOL→TON route test**
   - Go to https://app.symbiosis.finance
   - Test 0.1 SOL → TON manually with your own wallet
   - Confirm settlement happens within 90 seconds
   - Note the actual fee charged (compare to API quote)

3. **STON.fi JOOBI swap test**
   - Go to https://app.ston.fi
   - Buy 1 TON worth of JOOBI
   - Confirm the transaction settles cleanly
   - Note actual price impact at that size

4. **JOOBI jetton contract verification**
   - On tonviewer, open the Code section of the jetton master
   - Confirm it matches standard TEP-74 jetton code (no transfer hooks, no admin functions to pause/blacklist)
   - If contract has unusual code: **DO NOT INTEGRATE** until audited

---

## 20. Master Claude Code Prompt (Prompt 1)

Paste this into a fresh Replit with Node 20 template. This is your starting prompt.

````
# JoobiSwap — Cross-Chain SOL → TON/JOOBI Swap

Build a SimpleSwap-style cross-chain swap web app. Users land on a one-page form,
enter swap details, get a deposit address, send their SOL/USDC/USDT, and receive
TON or JOOBI at their TON address. NO wallet connection required.

## Reference

The complete specification is in `JOOBISWAP_BUILD_SPEC.md`. Read it first.
Specifically Sections 7 (repo structure), 8 (DB schema), 9 (API endpoints),
10 (service interfaces), 11 (state machine), 12 (frontend), 13 (security),
and 15 (acceptance test).

## Tech Stack (Locked)

- Monorepo: pnpm workspaces — apps/web (Next.js 14), apps/api (Express), packages/shared
- DB: PostgreSQL 15 + Drizzle ORM
- Queue: BullMQ on Redis 7
- Frontend: Next.js 14, React 18, Tailwind, shadcn/ui, TanStack Query
- Backend: Node.js 20, Express 4, Zod, Pino
- TypeScript strict mode everywhere

## Deliverables

1. Complete monorepo with pnpm workspaces, all package.json, root scripts
   (`dev`, `build`, `db:migrate`, `db:seed`, `audit:joobi`)
2. Postgres schema + migration + seed for `supported_tokens` (Section 3)
3. Express API with all endpoints (Section 9), services stubbed (Section 10)
4. All three stub services returning realistic data (Section 10)
5. Helius webhook handler with signature verification
6. Full state machine in `orchestrator.ts` BullMQ worker — must transition through
   all states using stubs (Section 11)
7. Complete Next.js frontend: landing + swap form + status page (Section 12)
8. Mobile-responsive at 375px
9. docker-compose.yml for local Postgres + Redis
10. README with setup, ASCII architecture diagram, run instructions
11. At least 5 happy-path integration tests using Vitest
12. JOOBI audit script at `scripts/audit-joobi.ts` (Section 17)
13. .replit and replit.nix configuration files (Section 16)

## DO NOT BUILD YET (Future Prompts)

- Real Privy/Symbiosis/STON.fi integrations (Prompt 2)
- Refund execution logic (Prompt 3)
- Admin dashboard UI (Prompt 4)
- Production hardening / Sentry (Prompt 5)

## Code Style

- TypeScript strict, no `any` (use `unknown` or proper types)
- ESLint + Prettier configured
- Functions <50 lines, files <300 lines
- All exported functions have JSDoc with @param and @returns
- Custom error classes extending base AppError
- No magic numbers — named constants
- Conventional commits

## Acceptance Test (Section 15)

After scaffolding, this must work end-to-end:

1. `pnpm install && docker-compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`
2. Open http://localhost:3000
3. Fill: 1 SOL → JOOBI, valid TON address
4. Click "Create Swap" → see deposit address + QR + countdown
5. `curl -X POST http://localhost:4000/api/admin/swaps/<id>/simulate-deposit`
6. Status page advances through every state over ~30 seconds
7. See COMPLETED with confetti and fake destination tx hash

If this E2E flow doesn't work with stubs, the scaffold is broken.

## Build Order

1. Monorepo root setup + pnpm workspaces + tsconfig + .gitignore
2. packages/shared (types + Zod schemas)
3. apps/api: db schema → routes (with stubs) → state machine worker
4. apps/web: layout → SwapForm → DepositInstructions → StatusTimeline
5. docker-compose + .replit + README
6. Vitest tests
7. audit-joobi script

Confirm each layer works before moving to the next. Run the acceptance test
after every major milestone.
````

---

## 21. Quick-Start Checklist

When you're ready to build, verify in order:

- [ ] All credentials obtained and saved in local `.env` (or Replit Secrets)
- [ ] Privy app in Development mode with policy created
- [ ] Helius API key generated and rotated to fresh value
- [ ] TonCenter API key obtained
- [ ] Symbiosis docs reviewed — no signup needed
- [ ] STON.fi docs reviewed — no signup needed
- [ ] JOOBI contract address verified on tonviewer
- [ ] LP token lock status manually verified (Section 19, item 1)
- [ ] Replit account ready
- [ ] Upstash Redis account ready (for production deploy)
- [ ] This document saved to repo as `JOOBISWAP_BUILD_SPEC.md`
- [ ] Master prompt (Section 20) ready to paste into Claude Code

Run order:
1. Paste Master Prompt (Section 20) into Claude Code on Replit
2. Once scaffold builds, run acceptance test (Section 15)
3. Run audit script (Section 17): `pnpm audit:joobi`
4. Move to Prompt 2 (real integrations)
5. Iterate through Prompts 3, 4, 5
6. Day 1 manual verifications (Section 19) before any production deploy
7. Deploy to Replit (Section 16)
8. Configure Helius webhook to deployed URL
9. Test 5–10 small real swaps with your own funds before public launch
10. Public launch

---

**End of build spec.**

For questions, edits, or scope changes — return to the chat and reference the
relevant section number.
