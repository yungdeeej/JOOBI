export const SOURCE_TOKENS = ['SOL', 'USDC_SOL', 'USDT_SOL'] as const;
export const DESTINATION_TOKENS = ['TON', 'JOOBI'] as const;

export type SourceToken = (typeof SOURCE_TOKENS)[number];
export type DestinationToken = (typeof DESTINATION_TOKENS)[number];

export const SWAP_STATES = [
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
] as const;

export type SwapState = (typeof SWAP_STATES)[number];

export const TERMINAL_STATES: ReadonlySet<SwapState> = new Set<SwapState>([
  'COMPLETED',
  'REFUNDED',
  'EXPIRED',
  'FAILED',
]);

export const ACTIVE_TIMELINE: SwapState[] = [
  'WAITING_DEPOSIT',
  'DEPOSIT_DETECTED',
  'DEPOSIT_CONFIRMED',
  'BRIDGING',
  'BRIDGE_CONFIRMED',
  'SWAPPING_TO_DESTINATION',
  'SENDING_TO_USER',
  'COMPLETED',
];

export interface QuoteResponse {
  quoteId: string;
  estimatedDestinationAmount: string;
  minDestinationAmount: string;
  platformFeeAmount: string;
  bridgeFeeAmount: string;
  estimatedTotalSeconds: number;
  priceImpactPercent: number;
  expiresAt: string;
}

export interface CreateSwapResponse {
  publicId: string;
  depositAddress: string;
  exactDepositAmount: string;
  expiresAt: string;
  statusUrl: string;
}

export interface SwapStatusResponse {
  publicId: string;
  state: SwapState;
  sourceToken: SourceToken;
  sourceAmount: string;
  destinationToken: DestinationToken;
  destinationAddress: string;
  depositAddress: string;
  exactDepositAmount: string;
  quotedDestinationAmount: string | null;
  minDestinationAmount: string | null;
  actualDestinationAmount: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  txHashes: {
    deposit: string | null;
    bridgeSource: string | null;
    bridgeDestination: string | null;
    destinationSwap: string | null;
    payout: string | null;
    refund: string | null;
  };
  errorMessage: string | null;
}
