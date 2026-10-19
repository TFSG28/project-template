import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { DIAGNOSTICS_TOKENS } from '../../../../shared/container/tokens/diagnostics.tokens';
import { WriteClientLogUseCase } from '../../application/usecases/WriteClientLog.usecase';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';
import { getClientIp, getUserAgent } from '../../../../shared/utils/network.util';

@injectable()
export class DiagnosticsController {
    constructor(
        @inject(DIAGNOSTICS_TOKENS.WriteClientLogUseCase)
        private readonly writeClientLog: WriteClientLogUseCase
    ) {}

    clientLog = asyncHandler(async (req: Request, res: Response) => {
        await this.writeClientLog.execute(req.body, {
            userId: req.user!.userId,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
        });
        return ApiResponse.success(res, { received: true });
    });
}
