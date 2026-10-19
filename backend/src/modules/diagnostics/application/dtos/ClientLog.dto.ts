import { z } from 'zod';

// Limites defensivos: o front só manda erros/warns curtos. Um payload enorme
// é sinal de abuso e é rejeitado na validação, antes de tocar no disco.
export const ClientLogSchema = z.object({
    body: z.object({
        level: z.enum(['error', 'warn']),
        message: z.string().min(1).max(2_000),
        context: z.record(z.string(), z.unknown()).nullable().optional(),
        userAgent: z.string().max(500).nullable().optional(),
    }),
});

export type ClientLogDTO = z.infer<typeof ClientLogSchema>['body'];
