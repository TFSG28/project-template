import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
    // Express augmentation requires a namespace (no ES module equivalent).
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
};
