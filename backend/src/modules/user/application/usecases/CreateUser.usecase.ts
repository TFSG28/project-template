import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../domain/repositories/IUser.repository';
import { CreateUserDTO } from '../dtos/CreateUser.dto';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';
import { PASSWORD_SALT_ROUNDS } from '../../../auth/auth.constants';

@injectable()
export class CreateUserUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private userRepository: IUserRepository
    ) {}

    async execute(data: CreateUserDTO) {
        const email = data.email.trim().toLowerCase();
        const existingUser = await this.userRepository.findByEmail(email);

        if (existingUser) {
            throw new UserAlreadyExistsError();
        }

        const hashedPassword = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);

        const user = await this.userRepository.create({
            ...data,
            email,
            password: hashedPassword,
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };
    }
}
