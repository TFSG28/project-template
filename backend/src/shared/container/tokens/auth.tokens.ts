export const AUTH_TOKENS = {
    // Services
    IJwtService: Symbol.for('IJwtService'),
    ILoginBlockerService: Symbol.for('ILoginBlockerService'),
    IAuthLoggerService: Symbol.for('IAuthLoggerService'),
    IMailService: Symbol.for('IMailService'),

    // Repositories
    ISessionRepository: Symbol.for('ISessionRepository'),
    IPasswordResetTokenRepository: Symbol.for('IPasswordResetTokenRepository'),

    // Use Cases
    LoginUseCase: Symbol.for('LoginUseCase'),
    GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
    RefreshTokenUseCase: Symbol.for('RefreshTokenUseCase'),
    LogoutUseCase: Symbol.for('LogoutUseCase'),
    RecoveryPasswordUseCase: Symbol.for('RecoveryPasswordUseCase'),
    ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
    CleanupExpiredAuthDataUseCase: Symbol.for('CleanupExpiredAuthDataUseCase'),

    // Controllers
    AuthController: Symbol.for('AuthController'),
} as const;
