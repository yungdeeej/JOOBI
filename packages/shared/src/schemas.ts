import { z } from 'zod';
import { SOURCE_TOKENS, DESTINATION_TOKENS } from './types.js';

const decimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/u, 'Must be a positive decimal string')
  .refine((v) => Number(v) > 0, { message: 'Must be greater than zero' });

export const sourceTokenSchema = z.enum(SOURCE_TOKENS);
export const destinationTokenSchema = z.enum(DESTINATION_TOKENS);

const tonAddressRegex = /^([EU]Q[A-Za-z0-9_-]{46}|0:[a-fA-F0-9]{64})$/u;
export const tonAddressSchema = z
  .string()
  .min(48)
  .max(68)
  .regex(tonAddressRegex, 'Invalid TON address');

export const quoteRequestSchema = z.object({
  sourceToken: sourceTokenSchema,
  sourceAmount: decimalString,
  destinationToken: destinationTokenSchema,
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const createSwapRequestSchema = z.object({
  sourceToken: sourceTokenSchema,
  sourceAmount: decimalString,
  destinationToken: destinationTokenSchema,
  destinationAddress: tonAddressSchema,
  slippageBps: z.number().int().min(10).max(1000).default(200),
  clientRequestId: z.string().uuid().optional(),
});
export type CreateSwapRequest = z.infer<typeof createSwapRequestSchema>;
