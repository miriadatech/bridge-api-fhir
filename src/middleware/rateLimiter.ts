import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit?.windowMs || 900000,
  max: config.rateLimit?.maxRequests || 100,
  message: { resourceType: 'OperationOutcome', issue: [{ severity: 'warning', code: 'throttled' }] }
});
