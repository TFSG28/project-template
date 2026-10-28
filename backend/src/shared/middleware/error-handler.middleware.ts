import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { captureSentryError } from '../services/sentry.service';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            code: err.code,
            message: err.message,
            ...(err instanceof ValidationError && err.errors && { errors: err.errors })
        });
    }

    // Erros de middlewares (ex.: limite do multipart) trazem status HTTP.
    const httpStatus = (err as { status?: number; statusCode?: number }).status
        ?? (err as { status?: number; statusCode?: number }).statusCode;
    if (typeof httpStatus === 'number' && httpStatus >= 400 && httpStatus < 500) {
        return res.status(httpStatus).json({
            status: 'error',
            code: httpStatus === 413 ? 'PAYLOAD_TOO_LARGE' : 'REQUEST_ERROR',
            message: httpStatus === 413 ? 'Ficheiro demasiado grande' : err.message,
        });
    }

    logger.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        correlationId: req.correlationId,
    }, 'Erro inesperado');

    // Copiado para o Sentry opt-in (no-op sem SENTRY_DSN). Fica no log acima com
    // o correlation id; ao cliente segue apenas o 500 genérico.
    captureSentryError(err, req);

    // Nunca expor detalhes internos (stack, SQL, mensagens do driver) ao
    // cliente. O erro completo fica no log acima com o correlation id.
    return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
    });
}
