# ADR 002: TSyringe para Dependency Injection

## Status
Aceito

## Contexto
Clean Architecture requer inversão de dependências. Precisávamos de uma solução para:
- Gerenciar dependências entre camadas
- Facilitar testes com mocks
- Manter código desacoplado

## Decisão
Escolhemos TSyringe porque:
- Suporte nativo a TypeScript
- Decorators simples (@injectable, @inject)
- Leve e performático
- Bem mantido

## Consequências

### Positivas
- Injeção automática de dependências
- Fácil criação de mocks para testes
- Código mais limpo e testável

### Negativas
- Requer reflect-metadata
- Decorators podem confundir iniciantes
- Debugging pode ser mais complexo

## Alternativas Consideradas
- InversifyJS (mais complexo)
- Awilix (não usa decorators)
- Manual dependency injection

## Exemplo
```typescript
@injectable()
class CreateUserUseCase {
    constructor(
        @inject(TOKENS.IUserRepository)
        private userRepository: IUserRepository
    ) {}
}
```
