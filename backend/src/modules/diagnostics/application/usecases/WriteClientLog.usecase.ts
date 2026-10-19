import { inject, injectable } from 'tsyringe';
import { DIAGNOSTICS_TOKENS } from '../../../../shared/container/tokens/diagnostics.tokens';
import { ClientLogDTO } from '../dtos/ClientLog.dto';
import { ClientLogContext, IClientLogWriterService } from '../../domain/services/IClientLogWriter.service';

@injectable()
export class WriteClientLogUseCase {
    constructor(
        @inject(DIAGNOSTICS_TOKENS.IClientLogWriterService)
        private readonly writer: IClientLogWriterService
    ) {}

    async execute(data: ClientLogDTO, meta: { userId: string; ipAddress: string; userAgent: string }): Promise<void> {
        const context: ClientLogContext = {
            ...data,
            userId: meta.userId,
            ipAddress: meta.ipAddress,
            userAgent: data.userAgent ?? meta.userAgent,
            context: data.context ?? null,
        };
        await this.writer.write(context);
    }
}
