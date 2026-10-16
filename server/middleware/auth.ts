import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, DEMO_USER_ID } from '../db/store.js';

const DEFAULT_JWT_SECRET = 'skillforge-dev-secret-key-saarthix-mvp-2026';

// Read lazily so environment variables loaded after module import (or per-test) are respected.
function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  isDemo?: boolean;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Demo user token bypass for judge convenience
  if (token === 'demo_token_aarav') {
    req.userId = DEMO_USER_ID;
    req.isDemo = true;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; isDemo?: boolean };
    const user = db.findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found.' });
      return;
    }

    req.userId = user.id;
    req.isDemo = !!user.isDemo;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Token expired or invalid.' });
  }
}

export function signToken(userId: string, isDemo: boolean = false): string {
  return jwt.sign({ userId, isDemo }, getJwtSecret(), { expiresIn: '7d' });
}
