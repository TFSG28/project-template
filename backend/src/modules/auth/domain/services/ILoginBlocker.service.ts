export interface LoginBlockResult {
    blocked: boolean;
    reason?: 'too_many_attempts_email' | 'too_many_attempts_ip';
}

export interface ILoginBlockerService {
    isBlocked(email: string, ipAddress: string): Promise<LoginBlockResult>;
    recordFailedAttempt(email: string, ipAddress: string): Promise<void>;
    clearAttempts(email: string, ipAddress: string): Promise<void>;
}
