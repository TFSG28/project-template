import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { REALTIME_TOKENS } from '../../../../shared/container/tokens/realtime.tokens';
import { IJwtService } from '../../../auth/domain/services/IJwt.service';
import { IRealtimeHub } from '../../domain/services/IRealtimeHub.service';
import { UnauthorizedError } from '../../../../shared/errors/AppError';

@injectable()
export class RealtimeController {
    constructor(
        @inject(REALTIME_TOKENS.IRealtimeHub) private readonly hub: IRealtimeHub,
        @inject(AUTH_TOKENS.IJwtService) private readonly jwtService: IJwtService
    ) {}

    stream = (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : '';
            if (!token) throw new UnauthorizedError('Token de realtime em falta');

            // EventSource não permite headers: o token curto vai na query e é
            // validado aqui, nunca no middleware de cookie.
            const user = this.jwtService.verifyRealtimeToken(token);
            const cleanup = this.hub.subscribe(user.userId, res);

            req.on('close', cleanup);
            res.on('error', cleanup);
        } catch {
            next(new UnauthorizedError('Token de realtime inválido'));
        }
    };
}
