import { z } from 'zod';

export const LoginSchema = z.object({
    body: z.object({
        email: z.email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória'),
    }),
});

export const RecoverPasswordSchema = z.object({
    body: z.object({
        email: z.email('Email inválido'),
    }),
});

export const ResetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token é obrigatório'),
        password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres'),
    }),
});

export type LoginDTO = z.infer<typeof LoginSchema>['body'];
export type RecoverPasswordDTO = z.infer<typeof RecoverPasswordSchema>['body'];
export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>['body'];

export interface RequestMeta {
    ipAddress?: string;
    userAgent?: string;
}

export interface UserData {
    id: string;
    name: string;
    email: string;
}

export interface LoginResponseDTO {
    token: string;
    refreshToken: string;
    user: UserData;
}
