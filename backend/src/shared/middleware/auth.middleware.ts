import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError';
import { env } from '../../config/env';
import { ACCESS_TOKEN_COOKIE } from '../../config/cookie.config';

interface JwtPayload {
    userId: string;
    email: string;
    role?: string;
    scope?: string;
}

declare global {
    // Express augmentation requires a namespace (no ES module equivalent).
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.[ACCESS_TOKEN_COOKIE];

        if (!token) {
            throw new UnauthorizedError('Não autenticado');
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        if (decoded.scope === 'realtime') {
            throw new UnauthorizedError('Token inválido para esta rota');
        }
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Sessão inválida ou expirada'));
        } else {
            next(error);
        }
    }
}
