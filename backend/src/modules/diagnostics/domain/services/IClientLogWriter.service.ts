import { ClientLogDTO } from '../../application/dtos/ClientLog.dto';

export interface ClientLogContext extends ClientLogDTO {
    userId: string;
    ipAddress: string;
}

export interface IClientLogWriterService {
    write(context: ClientLogContext): Promise<void>;
}
