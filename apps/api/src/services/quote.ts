import { nanoid } from 'nanoid';
import type {
  DestinationToken,
  QuoteResponse,
  SourceToken,
} from '@joobi/shared';
import { env } from '../lib/env.js';
import { stubSymbiosisService } from './symbiosis.js';
import { stubStonFiService } from './stonfi.js';
import { stubPriceService } from './price.js';
import { ValidationError } from '../lib/errors.js';

const SOLANA_CHAIN_ID = 7565164;
const TON_CHAIN_ID = 85918;

const fromTokenAddress = (sym: SourceToken): string => {
  if (sym === 'SOL') return '';
  if (sym === 'USDC_SOL') return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  return 'Es9vMFrzaCERmJfrF4H2FYD4KConKy4G6gS9X9TzYHBh';
};

export interface BuiltQuote extends QuoteResponse {
  symbiosisQuoteId: string;
  bridgedTonAmount: string;
}

export const buildQuote = async (params: {
  sourceToken: SourceToken;
  sourceAmount: string;
  destinationToken: DestinationToken;
  slippageBps?: number;
}): Promise<BuiltQuote> => {
  const slippageBps = params.slippageBps ?? 200;
  const usd = await stubPriceService.toUsd(params.sourceToken, params.sourceAmount);
  if (usd < env.MIN_SWAP_USD) {
    throw new ValidationError(`Below minimum swap of $${env.MIN_SWAP_USD}`);
  }
  if (usd > env.MAX_SWAP_USD) {
    throw new ValidationError(`Above maximum swap of $${env.MAX_SWAP_USD}`);
  }

  const platformFeeUsd = (usd * env.PLATFORM_FEE_BPS) / 10000;
  const platformFeeAmount = platformFeeUsd / (await stubPriceService.getUsdPrice(params.sourceToken));

  const symQuote = await stubSymbiosisService.getQuote({
    fromChainId: SOLANA_CHAIN_ID,
    toChainId: TON_CHAIN_ID,
    fromTokenAddress: fromTokenAddress(params.sourceToken),
    toTokenAddress: '',
    amount: params.sourceAmount,
    fromAddress: '',
    toAddress: '',
    slippage: slippageBps,
    partnerId: env.SYMBIOSIS_PARTNER_ID,
  });

  let estimatedDestinationAmount = symQuote.tokenAmountOut;
  let minDestinationAmount = symQuote.tokenAmountOutMin;
  let priceImpact = symQuote.priceImpactPercent;
  let extraSeconds = 0;

  if (params.destinationToken === 'JOOBI') {
    const stonQuote = await stubStonFiService.getJoobiQuote(symQuote.tokenAmountOut);
    estimatedDestinationAmount = stonQuote.joobiAmount;
    minDestinationAmount = stonQuote.minOut;
    priceImpact = Math.max(priceImpact, stonQuote.priceImpactPercent);
    extraSeconds = 15;
  }

  const expiresAt = new Date(Date.now() + env.QUOTE_TTL_SECONDS * 1000).toISOString();

  return {
    quoteId: `qte_${nanoid(12)}`,
    estimatedDestinationAmount,
    minDestinationAmount,
    platformFeeAmount: platformFeeAmount.toFixed(6),
    bridgeFeeAmount: symQuote.feeAmount,
    estimatedTotalSeconds: symQuote.estimatedTimeSeconds + extraSeconds,
    priceImpactPercent: priceImpact,
    expiresAt,
    symbiosisQuoteId: symQuote.quoteId,
    bridgedTonAmount: symQuote.tokenAmountOut,
  };
};
