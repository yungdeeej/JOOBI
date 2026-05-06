import type { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';
import { GeoBlockedError } from './errors.js';
import { geoBlockedCountries } from './env.js';

export const geoBlockMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (geoBlockedCountries.size === 0) return next();
  const ip = req.ip ?? req.socket.remoteAddress;
  if (!ip) return next();
  const lookup = geoip.lookup(ip);
  if (lookup && geoBlockedCountries.has(lookup.country)) {
    return next(new GeoBlockedError());
  }
  next();
};
