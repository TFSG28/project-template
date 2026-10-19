export class PasswordResetToken {
    constructor(
        public readonly userId: string,
        public readonly token: string,
        public readonly expiresAt: Date,
        public readonly createdAt: Date
    ) {}

    hasExpired(): boolean {
        return Date.now() > this.expiresAt.getTime();
    }
}
