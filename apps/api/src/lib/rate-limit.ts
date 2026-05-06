import type { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { RateLimitError } from './errors.js';

export interface RateLimitOptions {
  windowSeconds: number;
  max: number;
  keyPrefix: string;
}

export const createRateLimiter = (redis: Redis, opts: RateLimitOptions) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${opts.keyPrefix}:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSeconds);
      }
      if (count > opts.max) {
        return next(new RateLimitError(`Rate limit exceeded: ${opts.keyPrefix}`));
      }
      next();
    } catch (_err) {
      // Fail open if redis is unavailable in dev.
      next();
    }
  };
};
