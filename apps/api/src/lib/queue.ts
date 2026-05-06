import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from './env.js';

export const ORCHESTRATOR_QUEUE = 'orchestrator';
export const TIMEOUT_QUEUE = 'timeout-monitor';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const connection = { connection: redis };

export const orchestratorQueue = new Queue(ORCHESTRATOR_QUEUE, connection);
export const timeoutQueue = new Queue(TIMEOUT_QUEUE, connection);

export const orchestratorEvents = new QueueEvents(ORCHESTRATOR_QUEUE, connection);

export interface OrchestratorJobData {
  swapId: string;
  reason:
    | 'deposit-detected'
    | 'tick'
    | 'simulate-deposit';
}
