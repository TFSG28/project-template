import { container } from 'tsyringe';
import { AUTH_TOKENS } from './tokens/auth.tokens';
import { USER_TOKENS } from './tokens/user.tokens';
import { DIAGNOSTICS_TOKENS } from './tokens/diagnostics.tokens';
import { REALTIME_TOKENS } from './tokens/realtime.tokens';

// Controllers
import { AuthController } from '../../modules/auth/presentation/controllers/auth.controller';
import { UserController } from '../../modules/user/presentation/controllers/user.controller';
import { DiagnosticsController } from '../../modules/diagnostics/presentation/controllers/diagnostics.controller';
import { RealtimeController } from '../../modules/realtime/presentation/controllers/realtime.controller';

/**
 * Container Facade - Exports resolved instances
 * Routes import from here, they don't know DI details
 */

export const authController = container.resolve<AuthController>(AUTH_TOKENS.AuthController);
export const userController = container.resolve<UserController>(USER_TOKENS.UserController);
export const diagnosticsController = container.resolve<DiagnosticsController>(DIAGNOSTICS_TOKENS.DiagnosticsController);
export const realtimeController = container.resolve<RealtimeController>(REALTIME_TOKENS.RealtimeController);
