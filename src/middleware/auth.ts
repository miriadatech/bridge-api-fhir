import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'unauthorized' }]
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = jwt.verify(token, config.jwt.secret);
    
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'unauthorized' }]
    });
  }
};
