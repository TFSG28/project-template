import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { randomBytes } from 'node:crypto';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { LoginUseCase } from '../../application/usecases/Login.usecase';
import { GetCurrentUserUseCase } from '../../application/usecases/GetCurrentUser.usecase';
import { RefreshTokenUseCase } from '../../application/usecases/RefreshToken.usecase';
import { LogoutUseCase } from '../../application/usecases/Logout.usecase';
import { RecoveryPasswordUseCase } from '../../application/usecases/RecoveryPassword.usecase';
import { ResetPasswordUseCase } from '../../application/usecases/ResetPassword.usecase';
import { IJwtService } from '../../domain/services/IJwt.service';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';
import { getClientIp, getUserAgent } from '../../../../shared/utils/network.util';
import { UnauthorizedError } from '../../../../shared/errors/AppError';
import {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    CSRF_COOKIE,
    accessCookieOptions,
    refreshCookieOptions,
    csrfCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
    clearCsrfCookieOptions,
} from '../../../../config/cookie.config';

@injectable()
export class AuthController {
    constructor(
        @inject(AUTH_TOKENS.LoginUseCase) private readonly loginUseCase: LoginUseCase,
        @inject(AUTH_TOKENS.GetCurrentUserUseCase) private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
        @inject(AUTH_TOKENS.RefreshTokenUseCase) private readonly refreshTokenUseCase: RefreshTokenUseCase,
        @inject(AUTH_TOKENS.LogoutUseCase) private readonly logoutUseCase: LogoutUseCase,
        @inject(AUTH_TOKENS.RecoveryPasswordUseCase) private readonly recoveryPasswordUseCase: RecoveryPasswordUseCase,
        @inject(AUTH_TOKENS.ResetPasswordUseCase) private readonly resetPasswordUseCase: ResetPasswordUseCase,
        @inject(AUTH_TOKENS.IJwtService) private readonly jwtService: IJwtService
    ) {}

    private issueSession(res: Response, token: string, refreshToken: string): string {
        const csrfToken = randomBytes(32).toString('hex');
        res.cookie(ACCESS_TOKEN_COOKIE, token, accessCookieOptions);
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);
        res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions);
        return csrfToken;
    }

    private clearSession(res: Response): void {
        res.clearCookie(ACCESS_TOKEN_COOKIE, clearAccessCookieOptions);
        res.clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshCookieOptions);
        res.clearCookie(CSRF_COOKIE, clearCsrfCookieOptions);
    }

    private requestMeta(req: Request) {
        return { ipAddress: getClientIp(req), userAgent: getUserAgent(req) };
    }

    login = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.loginUseCase.execute(req.body, this.requestMeta(req));
        const csrfToken = this.issueSession(res, result.token, result.refreshToken);
        return ApiResponse.success(res, { user: result.user, csrfToken });
    });

    logout = asyncHandler(async (req: Request, res: Response) => {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? '';
        await this.logoutUseCase.execute(refreshToken, this.requestMeta(req));
        this.clearSession(res);
        return ApiResponse.success(res, { message: 'Logout realizado com sucesso' });
    });

    me = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.getCurrentUserUseCase.execute(req.user!.userId);
        return ApiResponse.success(res, user);
    });

    // Rotação do refresh token. O cookie de refresh é httpOnly e restrito a
    // /api/v1/auth; o cliente recebe apenas o novo CSRF token.
    refresh = asyncHandler(async (req: Request, res: Response) => {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
        if (!refreshToken) {
            this.clearSession(res);
            throw new UnauthorizedError('Sessão inválida ou expirada', 'INVALID_REFRESH_TOKEN');
        }

        try {
            const result = await this.refreshTokenUseCase.execute(refreshToken, this.requestMeta(req));
            const csrfToken = this.issueSession(res, result.token, result.refreshToken);
            return ApiResponse.success(res, { csrfToken });
        } catch (error) {
            this.clearSession(res);
            throw error;
        }
    });

    // Token dedicado ao EventSource (o browser não permite headers no SSE).
    streamToken = asyncHandler(async (req: Request, res: Response) => {
        const token = this.jwtService.generateRealtimeToken({
            userId: req.user!.userId,
            email: req.user!.email,
        });
        return ApiResponse.success(res, { token });
    });

    recoverPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.recoveryPasswordUseCase.execute(req.body.email);
        // Resposta genérica para não revelar se o email existe.
        return ApiResponse.success(res, {
            message: 'Se o email existir, receberás instruções de recuperação.',
        });
    });

    resetPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.resetPasswordUseCase.execute(req.body.token, req.body.password, this.requestMeta(req));
        this.clearSession(res);
        return ApiResponse.success(res, { message: 'Password alterada com sucesso' });
    });
}
