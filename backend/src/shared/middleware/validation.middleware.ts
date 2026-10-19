import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { ValidationError } from '../errors/AppError';

/**
 * Valida `{ body, query, params }` com um schema Zod e substitui os valores
 * pelos dados já normalizados (trim, defaults, transforms).
 *
 * Zod v4: usa `issues` (o antigo `errors` foi removido).
 */
export const validate = (schema: ZodType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            if (parsed && typeof parsed === 'object') {
                const data = parsed as { body?: unknown; query?: unknown; params?: unknown };
                if (data.body !== undefined) req.body = data.body;
                if (data.query !== undefined) req.query = data.query as Request['query'];
                if (data.params !== undefined) req.params = data.params as Request['params'];
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.issues.reduce((acc, issue) => {
                    acc[issue.path.join('.')] = issue.message;
                    return acc;
                }, {} as Record<string, string>);

                next(new ValidationError('Dados inválidos', errors));
            } else {
                next(error);
            }
        }
    };
};
