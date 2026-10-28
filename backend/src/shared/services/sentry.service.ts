import * as Sentry from '@sentry/node';
import { env } from '../../config/env';

// Opt-in: só envia eventos quando SENTRY_DSN está definido. O DSN é público por
// design, por isso não há segredo em .env.example — mas sem DSN nada é enviado.

let enabled = false;

type RequestLike = {
    method?: string;
    url?: string;
    correlationId?: string;
};

export function isSentryEnabled(): boolean {
    return enabled;
}

export function initSentry(
    dsn: string | undefined = env.SENTRY_DSN,
    environment: string | undefined = env.SENTRY_ENVIRONMENT,
): boolean {
    if (!dsn) return false;

    // ponytail: erros + tracing básico. Breadcrumbs/HTTP body e todo o resto
    // ficam nos defaults do SDK; upgrade de observability (OTel, sourcemaps por CI)
    // = adicionar integrations aqui e um passo no pipeline.
    Sentry.init({
        dsn,
        environment: environment ?? env.NODE_ENV,
        tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    enabled = true;
    return true;
}

export function captureSentryError(err: unknown, req?: RequestLike): void {
    if (!enabled) return;

    Sentry.withScope((scope) => {
        if (req?.correlationId) scope.setTag('correlationId', req.correlationId);
        if (req?.method) scope.setTag('http.method', req.method);
        if (req?.url) scope.setTag('http.url', req.url);
        Sentry.captureException(err);
    });
}
