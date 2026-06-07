import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

interface JwtPayload {
  id: number;
  role: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Tentar obter o token a partir do header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // 2. Tentar obter o token a partir de cookies (HttpOnly)
  if (!token && (req as any).cookies) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Token não fornecido ou acesso não autorizado' });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn('⚠️ JWT_SECRET não configurado nas variáveis de ambiente!');
    }
    const decoded = jwt.verify(token, jwtSecret || 'fallback_secret') as JwtPayload;
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito ao administrador' });
    return;
  }
  next();
}
