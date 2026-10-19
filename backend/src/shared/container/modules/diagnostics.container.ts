import { container } from 'tsyringe';
import { DIAGNOSTICS_TOKENS } from '../tokens/diagnostics.tokens';

import { ClientLogWriterService } from '../../../modules/diagnostics/infrastructure/services/ClientLogWriter.service';
import { WriteClientLogUseCase } from '../../../modules/diagnostics/application/usecases/WriteClientLog.usecase';
import { DiagnosticsController } from '../../../modules/diagnostics/presentation/controllers/diagnostics.controller';

export function setupDiagnosticsContainer() {
    container.registerSingleton(DIAGNOSTICS_TOKENS.IClientLogWriterService, ClientLogWriterService);
    container.register(DIAGNOSTICS_TOKENS.WriteClientLogUseCase, WriteClientLogUseCase);
    container.register(DIAGNOSTICS_TOKENS.DiagnosticsController, DiagnosticsController);
}
