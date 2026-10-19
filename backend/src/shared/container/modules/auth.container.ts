import { container } from 'tsyringe';
import { AUTH_TOKENS } from '../tokens/auth.tokens';

// Services
import { JwtService } from '../../../modules/auth/infrastructure/services/Jwt.service';
import { LoginBlockerService } from '../../../modules/auth/infrastructure/services/LoginBlocker.service';
import { AuthLoggerService } from '../../../modules/auth/infrastructure/services/AuthLogger.service';
import { MailService } from '../../services/mail/Mail.service';

// Repositories
import { SessionRepository } from '../../../modules/auth/infrastructure/repositories/Session.repository';
import { PasswordResetTokenRepository } from '../../../modules/auth/infrastructure/repositories/PasswordResetToken.repository';

// Use Cases
import { LoginUseCase } from '../../../modules/auth/application/usecases/Login.usecase';
import { GetCurrentUserUseCase } from '../../../modules/auth/application/usecases/GetCurrentUser.usecase';
import { RefreshTokenUseCase } from '../../../modules/auth/application/usecases/RefreshToken.usecase';
import { LogoutUseCase } from '../../../modules/auth/application/usecases/Logout.usecase';
import { RecoveryPasswordUseCase } from '../../../modules/auth/application/usecases/RecoveryPassword.usecase';
import { ResetPasswordUseCase } from '../../../modules/auth/application/usecases/ResetPassword.usecase';
import { CleanupExpiredAuthDataUseCase } from '../../../modules/auth/application/usecases/CleanupExpiredAuthData.usecase';

// Controllers
import { AuthController } from '../../../modules/auth/presentation/controllers/auth.controller';

export function setupAuthContainer() {
    // Services (Singleton)
    container.registerSingleton(AUTH_TOKENS.IJwtService, JwtService);
    container.registerSingleton(AUTH_TOKENS.ILoginBlockerService, LoginBlockerService);
    container.registerSingleton(AUTH_TOKENS.IAuthLoggerService, AuthLoggerService);
    container.registerSingleton(AUTH_TOKENS.IMailService, MailService);

    // Repositories (Singleton)
    container.registerSingleton(AUTH_TOKENS.ISessionRepository, SessionRepository);
    container.registerSingleton(AUTH_TOKENS.IPasswordResetTokenRepository, PasswordResetTokenRepository);

    // Use Cases (Transient)
    container.register(AUTH_TOKENS.LoginUseCase, LoginUseCase);
    container.register(AUTH_TOKENS.GetCurrentUserUseCase, GetCurrentUserUseCase);
    container.register(AUTH_TOKENS.RefreshTokenUseCase, RefreshTokenUseCase);
    container.register(AUTH_TOKENS.LogoutUseCase, LogoutUseCase);
    container.register(AUTH_TOKENS.RecoveryPasswordUseCase, RecoveryPasswordUseCase);
    container.register(AUTH_TOKENS.ResetPasswordUseCase, ResetPasswordUseCase);
    container.register(AUTH_TOKENS.CleanupExpiredAuthDataUseCase, CleanupExpiredAuthDataUseCase);

    // Controllers (Transient)
    container.register(AUTH_TOKENS.AuthController, AuthController);
}
