import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { csrfMiddleware } from '../../../../shared/middleware/csrf.middleware';
import {
    LoginSchema,
    RecoverPasswordSchema,
    ResetPasswordSchema,
} from '../../application/dtos/Login.dto';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    message: { status: 'error', code: 'TOO_MANY_ATTEMPTS', message: 'Demasiadas tentativas. Tenta novamente mais tarde.' },
});

const recoveryLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    message: { status: 'error', code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados pedidos. Tenta novamente mais tarde.' },
});

// Public
router.post('/login', authLimiter, validate(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/recover-password', recoveryLimiter, validate(RecoverPasswordSchema), authController.recoverPassword);
router.post('/reset-password', recoveryLimiter, validate(ResetPasswordSchema), authController.resetPassword);

// Authenticated
router.get('/me', authMiddleware, authController.me);
router.get('/stream-token', authMiddleware, authController.streamToken);
// Sem authMiddleware: o access token pode já ter expirado, mas o refresh
// cookie (httpOnly, restrito a /auth) ainda permite revogar a sessão. O CSRF
// continua a impedir que um site terceiro faça logout do utilizador.
router.post('/logout', csrfMiddleware, authController.logout);

export default router;
