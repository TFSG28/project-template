import { injectable } from 'tsyringe';
import jwt, { SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { IJwtService, JwtPayload, RealtimeTokenPayload } from '../../domain/services/IJwt.service';
import { UnauthorizedError } from '../../../../shared/errors/AppError';
import {
    ACCESS_TOKEN_TTL_MS,
    REALTIME_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
} from '../../auth.constants';

@injectable()
export class JwtService implements IJwtService {
    private readonly secret: string;

    constructor() {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET not configured');
        this.secret = secret;
    }

    generateToken(payload: JwtPayload): string {
        return jwt.sign(payload, this.secret, {
            expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
        } as SignOptions);
    }

    generateRefreshToken(): string {
        return randomBytes(64).toString('hex');
    }

    getRefreshTokenExpiry(): Date {
        return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    }

    generateRealtimeToken(payload: JwtPayload): string {
        const body: RealtimeTokenPayload = { ...payload, scope: 'realtime' };
        return jwt.sign(body, this.secret, {
            expiresIn: REALTIME_TOKEN_TTL_MS / 1000,
        } as SignOptions);
    }

    verifyToken(token: string): JwtPayload {
        return jwt.verify(token, this.secret) as JwtPayload;
    }

    verifyRealtimeToken(token: string): JwtPayload {
        const payload = jwt.verify(token, this.secret) as RealtimeTokenPayload;
        if (payload.scope !== 'realtime') {
            throw new UnauthorizedError('Token de realtime inválido');
        }
        return { userId: payload.userId, email: payload.email };
    }
}
