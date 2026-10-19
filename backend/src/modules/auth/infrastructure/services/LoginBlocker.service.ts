import { injectable } from 'tsyringe';
import { ILoginBlockerService, LoginBlockResult } from '../../domain/services/ILoginBlocker.service';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// Bloqueio por conta: 5 falhas bloqueiam esse email, independentemente do IP.
// O limite por IP é generoso de propósito: várias pessoas atrás de um NAT
// partilham o mesmo endereço.
const MAX_ATTEMPTS_BY_EMAIL = 5;
const MAX_ATTEMPTS_BY_IP = 50;

interface AttemptCounter {
    count: number;
    expiresAt: number;
}

// ponytail: estado em memória, válido para uma única instância. Com várias
// réplicas as contagens não são partilhadas; migrar para Redis nesse caso.
@injectable()
export class LoginBlockerService implements ILoginBlockerService {
    private readonly byEmail = new Map<string, AttemptCounter>();
    private readonly byIp = new Map<string, AttemptCounter>();

    private read(map: Map<string, AttemptCounter>, key: string): number {
        const entry = map.get(key);
        if (!entry) return 0;
        if (Date.now() > entry.expiresAt) {
            map.delete(key);
            return 0;
        }
        return entry.count;
    }

    private bump(map: Map<string, AttemptCounter>, key: string): void {
        const now = Date.now();
        const entry = map.get(key);
        if (!entry || now > entry.expiresAt) {
            map.set(key, { count: 1, expiresAt: now + WINDOW_MS });
            return;
        }
        entry.count += 1;
    }

    async isBlocked(email: string, ipAddress: string): Promise<LoginBlockResult> {
        const key = email.trim().toLowerCase();
        if (this.read(this.byEmail, key) >= MAX_ATTEMPTS_BY_EMAIL) {
            return { blocked: true, reason: 'too_many_attempts_email' };
        }
        if (this.read(this.byIp, ipAddress) >= MAX_ATTEMPTS_BY_IP) {
            return { blocked: true, reason: 'too_many_attempts_ip' };
        }
        return { blocked: false };
    }

    async recordFailedAttempt(email: string, ipAddress: string): Promise<void> {
        this.bump(this.byEmail, email.trim().toLowerCase());
        this.bump(this.byIp, ipAddress);
    }

    async clearAttempts(email: string, ipAddress: string): Promise<void> {
        this.byEmail.delete(email.trim().toLowerCase());
        this.byIp.delete(ipAddress);
    }
}
