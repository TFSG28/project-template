import 'reflect-metadata';
import './config/env';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { corsMiddleware } from './config';
import { UPLOAD_ROOT } from './shared/storage/LocalAttachmentStorage.service';
import { uploadResponseHeaders } from './shared/storage/upload.security';
import { sanitizeDownloadName } from './shared/storage/path.util';
import { helmetConfig, securityHeaders } from './config/security.config';
import routes from './shared/routes';
import { initCronJobs } from './cron';
import { errorHandler } from './shared/middleware/error-handler.middleware';
import { correlationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import { metricsMiddleware } from './shared/middleware/metrics.middleware';
import { sanitizationMiddleware } from './shared/middleware/sanitization.middleware';
import { healthCheck, readinessCheck, livenessCheck } from './shared/utils/health';
import { metricsHandler } from './config/metrics.config';


const app: Application = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

initCronJobs();

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Muitas requisições, tente novamente mais tarde.'
    }
});

app.use(helmetConfig);
app.use(securityHeaders);

// SSE nunca pode ser comprimido: o gzip bufferiza chunks pequenos (~16KB) e os
// eventos ficam retidos até o bloco encher — a ligação parece morta. O header
// só existe quando o controller SSE já correu, por isso o filtro olha para ele.
app.use(compression({
    filter: (req, res) => {
        if (res.getHeader('Content-Type') === 'text/event-stream') return false;
        return compression.filter(req, res);
    },
}));

app.use(limiter);
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizationMiddleware);

app.get('/health', healthCheck);
app.get('/health/ready', readinessCheck);
app.get('/health/live', livenessCheck);
app.get('/metrics', metricsHandler);

// Anexos públicos. Tipos perigosos (HTML/SVG/executáveis) são descarregados
// como attachment e o nosniff impede o browser de adivinhar o tipo.
app.use('/uploads', express.static(UPLOAD_ROOT, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        uploadResponseHeaders(res, filePath, sanitizeDownloadName(filePath));
    },
}));

app.use('/api/v1', routes);

app.use(errorHandler);

export default app;
