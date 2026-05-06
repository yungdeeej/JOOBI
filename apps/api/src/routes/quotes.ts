import { Router } from 'express';
import { quoteRequestSchema } from '@joobi/shared';
import { buildQuote } from '../services/quote.js';
import { ValidationError } from '../lib/errors.js';

export const quotesRouter = Router();

quotesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = quoteRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid quote request', parsed.error.flatten());
    const quote = await buildQuote(parsed.data);
    const { symbiosisQuoteId: _ignore, bridgedTonAmount: _ignore2, ...publicQuote } = quote;
    res.json(publicQuote);
  } catch (err) {
    next(err);
  }
});
