# JoobiSwap

Cross-chain swap service: SOL / USDC-SOL / USDT-SOL → TON / JOOBI.
SimpleSwap-style — no wallet connect, ephemeral per-swap deposit addresses.

The complete product specification lives in [`JOOBISWAP_BUILD_SPEC.md`](./JOOBISWAP_BUILD_SPEC.md).
This README covers what's in this repo today (Prompt 1 scaffold) and how to run it.

## Architecture

```
                 ┌──────────────────┐
   user ────►    │  apps/web        │  ── /api/proxy/* ──┐
   browser       │  Next.js 14 SSR  │                    │
                 └──────────────────┘                    ▼
                                              ┌────────────────────┐
                                              │  apps/api          │
                                              │  Express + Zod     │
                                              │  routes/*.ts       │
                                              └────────────────────┘
                                                  │      │     │
                                                  ▼      ▼     ▼
                                       ┌─────────┐ ┌────────┐ ┌────────────┐
                                       │ Postgres│ │ Redis  │ │ BullMQ     │
                                       │ Drizzle │ │        │ │ orchestrat │
                                       └─────────┘ └────────┘ └────────────┘
                                                                   │
                                                  ┌────────────────┼────────────────┐
                                                  ▼                ▼                ▼
                                          stub Privy        stub Symbiosis    stub STON.fi
                                          (Solana wallet)   (cross-chain)     (TON DEX)
```

All external services are stubbed in this scaffold — the full state machine works without
any API keys. Real implementations land in Prompt 2.

## What's here (Prompt 1 deliverables)

- `apps/api` — Express server, BullMQ orchestrator worker, Drizzle ORM, all routes
- `apps/web` — Next.js 14 (App Router) landing + swap form + status page
- `packages/shared` — types and Zod schemas shared between web and api
- `scripts/audit-joobi.ts` — JOOBI pre-build audit script
- `docker-compose.yml` — local Postgres 15 + Redis 7
- `.replit` + `replit.nix` — Replit deployment config

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Postgres + Redis)

## Quickstart

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## End-to-end test (Section 15 of the spec)

The full state machine runs against stubs — no external credentials needed.

1. Open `http://localhost:3000`.
2. Form: 1 SOL → JOOBI, valid TON address (UQ… or EQ…).
3. Click **Create Swap**. You'll be redirected to `/swap/<publicId>` with the deposit
   address, exact amount, QR code, and a 20-minute countdown.
4. Trigger a fake deposit:
   ```bash
   curl -X POST http://localhost:4000/api/admin/swaps/<publicId>/simulate-deposit
   ```
   (You can pass either the UUID `id` or the `swp_…` `publicId`.)
5. The status page advances through every state in real time over ~12 seconds.
6. On `COMPLETED` you'll see the destination amount and a fake payout tx hash.

## Project scripts

| Script | Effect |
|---|---|
| `pnpm dev` | Run web (3000) + api (4000) in parallel |
| `pnpm build` | Build all workspaces |
| `pnpm db:migrate` | Apply SQL migrations in `apps/api/src/db/migrations` |
| `pnpm db:seed` | Seed `supported_tokens` |
| `pnpm test` | Vitest in all workspaces |
| `pnpm audit:joobi` | Run JOOBI pre-build audit (live network) |

## Repository layout

```
joobiswap/
├── apps/
│   ├── api/                    # Express backend
│   │   └── src/
│   │       ├── db/             # Drizzle schema + migrations + seed
│   │       ├── lib/            # env, logger, errors, queue, rate-limit, geo
│   │       ├── routes/         # quotes, swaps, webhooks, admin
│   │       ├── services/       # stubs: privy, symbiosis, stonfi, helius, ton-client, price, quote
│   │       ├── workers/        # orchestrator state machine + timeout-monitor
│   │       └── test/           # Vitest happy-path tests
│   └── web/                    # Next.js 14 frontend
│       ├── app/                # Landing, /swap/[publicId], providers, layout
│       ├── components/         # SwapForm, QuoteDisplay, SlippageWarning, DepositInstructions, StatusTimeline
│       └── lib/                # api-client, validation
├── packages/
│   └── shared/                 # cross-package types + Zod schemas
├── scripts/audit-joobi.ts      # JOOBI pre-build audit
├── docker-compose.yml          # local Postgres + Redis
├── .replit / replit.nix        # Replit deploy config
├── .env.example
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── JOOBISWAP_BUILD_SPEC.md     # full product / build spec
```

## State machine

```
WAITING_DEPOSIT
  → DEPOSIT_DETECTED
  → DEPOSIT_CONFIRMED
  → BRIDGING
  → BRIDGE_CONFIRMED
  → SWAPPING_TO_DESTINATION   (skipped if destination is TON)
  → DESTINATION_SWAP_CONFIRMED
  → SENDING_TO_USER
  → COMPLETED
```

Failure branches: `EXPIRED`, `REFUND_REQUIRED → REFUND_IN_PROGRESS → REFUNDED`,
`MANUAL_REVIEW`, `FAILED`.

Implementation: `apps/api/src/workers/orchestrator.ts`. Real refund execution
is Prompt 3.

## Configuration

Copy `.env.example` to `.env`. The defaults work out-of-the-box for local dev:

- `USE_STUBS=true` keeps all external integrations stubbed.
- `DATABASE_URL` and `REDIS_URL` match `docker-compose.yml`.
- Production secrets (Privy, Helius, TonCenter, etc.) live in Replit Secrets,
  never in committed files. See spec section 5 for credential sources.

## Replit deployment

`.replit` and `replit.nix` are checked in. Use a Reserved VM Deployment so the
BullMQ worker stays warm. Copy each line of `.env.example` into Replit Secrets,
then update `APP_BASE_URL` / `API_BASE_URL` to the deployed URL.

## What's *not* here (future prompts)

- **Prompt 2** — real Privy / Symbiosis / STON.fi integrations (replace stubs)
- **Prompt 3** — refund execution engine
- **Prompt 4** — `/admin` dashboard UI
- **Prompt 5** — Sentry, Telegram alerts, Prometheus, fingerprint rate-limiting

The `services/*.ts` interfaces are stable; Prompt 2 only changes implementations.

## License

Internal. See spec for compliance constraints (geo-block, FINTRAC plan).
