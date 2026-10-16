import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  const code = (err as Error & { code?: string }).code;
  if (['P2024', 'P2037', '53300'].includes(code || '') ||
      /EMAXCONNSESSION|MaxClientsInSessionMode|max clients reached|too many clients already/i.test(err.message)) {
    console.error('Database connection capacity exhausted');
    res.setHeader('Retry-After', '2');
    return res.status(503).json({ error: 'The database is busy. Please try again shortly.' });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'An unexpected error occurred',
  });
}
