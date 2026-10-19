import { container } from 'tsyringe';
import { REALTIME_TOKENS } from '../tokens/realtime.tokens';
import { RealtimeHub } from '../../../modules/realtime/infrastructure/services/RealtimeHub.service';
import { RealtimeController } from '../../../modules/realtime/presentation/controllers/realtime.controller';

export function setupRealtimeContainer() {
    container.registerSingleton(REALTIME_TOKENS.IRealtimeHub, RealtimeHub);
    container.register(REALTIME_TOKENS.RealtimeController, RealtimeController);
}
