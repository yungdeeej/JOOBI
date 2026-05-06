import express, { type ErrorRequestHandler } from 'express';
import pinoHttp from 'pino-http';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { quotesRouter } from './routes/quotes.js';
import { swapsRouter } from './routes/swaps.js';
import { webhooksRouter } from './routes/webhooks.js';
import { adminRouter } from './routes/admin.js';
import { startOrchestratorWorker } from './workers/orchestrator.js';
import { startTimeoutMonitor } from './workers/timeout-monitor.js';
import { redis } from './lib/queue.js';
import { createRateLimiter } from './lib/rate-limit.js';
import { geoBlockMiddleware } from './lib/geo.js';
import { AppError } from './lib/errors.js';

const app = express();
app.set('trust proxy', true);
app.use(pinoHttp({ logger }));

app.use((req, res, next) => {
  const origin = env.APP_BASE_URL;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Helius-Auth,X-Helius-Signature',
  );
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Webhooks need raw body BEFORE express.json
app.use('/api/webhooks', webhooksRouter);

app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: env.NODE_ENV, useStubs: env.USE_STUBS });
});

const quotesLimiter = createRateLimiter(redis, {
  windowSeconds: 60,
  max: 10,
  keyPrefix: 'rl:quotes',
});
const swapsLimiter = createRateLimiter(redis, {
  windowSeconds: 3600,
  max: 5,
  keyPrefix: 'rl:swaps',
});

app.use('/api/quotes', geoBlockMiddleware, quotesLimiter, quotesRouter);
app.use('/api/swaps', geoBlockMiddleware, swapsLimiter, swapsRouter);
app.use('/api/admin', adminRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
};
app.use(errorHandler);

const orchestratorWorker = startOrchestratorWorker();
const stopTimeoutMonitor = startTimeoutMonitor();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, useStubs: env.USE_STUBS }, 'api listening');
});

const shutdown = async (sig: string) => {
  logger.info({ sig }, 'shutting down');
  stopTimeoutMonitor();
  await orchestratorWorker.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
