# ADR 001: Adoção de Clean Architecture

## Status
Aceito

## Contexto
Precisávamos de uma arquitetura que permitisse:
- Separação clara de responsabilidades
- Testabilidade
- Independência de frameworks
- Facilidade de manutenção
- Escalabilidade

## Decisão
Adotamos Clean Architecture com as seguintes camadas:

1. **Domain**: Entidades e regras de negócio
2. **Application**: Casos de uso
3. **Infrastructure**: Implementações técnicas
4. **Presentation**: Controllers e rotas

## Consequências

### Positivas
- Código altamente testável
- Baixo acoplamento entre camadas
- Fácil substituição de dependências
- Regras de negócio isoladas

### Negativas
- Mais arquivos e estrutura de pastas
- Curva de aprendizado inicial
- Pode ser over-engineering para projetos pequenos

## Alternativas Consideradas
- MVC tradicional
- Arquitetura em camadas simples
- Hexagonal Architecture

## Referências
- Clean Architecture (Robert C. Martin)
- https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
