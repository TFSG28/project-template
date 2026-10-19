export class Session {
    private _refreshToken: string;
    private _isActive: boolean;
    private _lastUsedAt: Date;

    constructor(
        public readonly id: string,
        public readonly userId: string,
        refreshToken: string,
        isActive: boolean,
        public readonly expiresAt: Date,
        public readonly createdAt: Date,
        lastUsedAt: Date,
        public readonly ipAddress?: string,
        public readonly userAgent?: string
    ) {
        this._refreshToken = refreshToken;
        this._isActive = isActive;
        this._lastUsedAt = lastUsedAt;
    }

    get refreshToken(): string { return this._refreshToken; }
    get isActive(): boolean { return this._isActive; }
    get lastUsedAt(): Date { return this._lastUsedAt; }

    hasExpired(): boolean {
        return Date.now() > this.expiresAt.getTime();
    }

    deactivate(): void {
        this._isActive = false;
        this._lastUsedAt = new Date();
    }

    rotate(newRefreshToken: string): void {
        this._refreshToken = newRefreshToken;
        this._lastUsedAt = new Date();
    }
}
