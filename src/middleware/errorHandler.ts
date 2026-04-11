import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log' })
  ]
});

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code: string = 'internal-error') {
    super(message);
  }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  logger.error({ message: err.message, stack: err.stack });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: err.code, details: { text: err.message } }]
    });
  }

  res.status(500).json({
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'fatal', code: 'exception' }]
  });
};
