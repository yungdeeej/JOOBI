import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from './env.js';
import type { SwapState } from '@joobi/shared';

export const ORCHESTRATOR_QUEUE = 'orchestrator';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const connection = { connection: redis };

export const orchestratorQueue = new Queue<OrchestratorJobData>(
  ORCHESTRATOR_QUEUE,
  connection,
);

export const orchestratorEvents = new QueueEvents(ORCHESTRATOR_QUEUE, connection);

export interface OrchestratorJobData {
  swapId: string;
  /** State the job is expected to advance FROM. The worker no-ops if the swap
   *  has moved on. Optional for the very first kick-off where any active
   *  state is acceptable. */
  expectFrom?: SwapState;
  reason: 'deposit-detected' | 'tick' | 'simulate-deposit' | 'retry';
}

export const enqueueOrchestrator = (
  data: OrchestratorJobData,
  opts: { delay?: number; jobId?: string } = {},
) =>
  orchestratorQueue.add('advance', data, {
    delay: opts.delay,
    jobId: opts.jobId,
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
