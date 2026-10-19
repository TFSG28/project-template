import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { diagnosticsController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { ClientLogSchema } from '../../application/dtos/ClientLog.dto';

const router = Router();

const clientLogLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
    message: { status: 'error', code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados logs. Tenta novamente mais tarde.' },
});

router.post('/client-log', authMiddleware, clientLogLimiter, validate(ClientLogSchema), diagnosticsController.clientLog);

export default router;
