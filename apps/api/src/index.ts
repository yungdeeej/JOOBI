import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { buildApp } from './app.js';
import { startOrchestratorWorker } from './workers/orchestrator.js';
import { startTimeoutMonitor } from './workers/timeout-monitor.js';
import { redis } from './lib/queue.js';

const app = buildApp({ redis });
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
