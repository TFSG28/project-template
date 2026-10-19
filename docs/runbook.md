# Runbook - Perfect Template

## Procedimentos Operacionais

### Startup

#### Desenvolvimento Local
```bash
# Backend
cd backend
npm install
npm run db-update
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

#### Docker
```bash
docker-compose up -d
docker-compose logs -f backend
```

### Shutdown

#### Graceful Shutdown
```bash
# Envia SIGTERM para o processo
kill -TERM <pid>

# Ou via Docker
docker-compose down
```

O servidor:
1. Para de aceitar novas conexões
2. Aguarda requisições em andamento (max 30s)
3. Desconecta do banco de dados
4. Encerra

### Health Checks

#### Endpoints
- `/health` - Status geral do sistema
- `/health/ready` - Pronto para receber tráfego
- `/health/live` - Processo está vivo

#### Verificação Manual
```bash
curl http://localhost:3001/health
```

#### Resposta Esperada
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": { "status": "up", "responseTime": 5 }
  },
  "memory": {
    "used": 150,
    "total": 512,
    "percentage": 29
  }
}
```

### Monitoring

#### Métricas (Prometheus)
```bash
curl http://localhost:3001/metrics
```

Métricas disponíveis:
- `http_requests_total` - Total de requisições
- `http_request_duration_seconds` - Latência
- `active_connections` - Conexões ativas
- `database_query_duration_seconds` - Tempo de queries

#### Logs
```bash
# Docker
docker-compose logs -f backend

# Local
tail -f backend/logs/app.log
```

Formato de log:
```json
{
  "level": "info",
  "time": "2024-01-01T00:00:00.000Z",
  "msg": "GET /api/v1/users 200",
  "correlationId": "uuid",
  "duration": 45
}
```

### Auth operations

#### Reset a user's password (operator)
Use the app's recovery flow. If email is not configured, the recovery request
will log `RECOVERY_EMAIL_FAILED` and remove the token; set `EMAIL`/`EMAIL_PASS`
or update the password through Prisma.

#### Revoke all sessions for a user
```sql
UPDATE Session SET isActive = 0 WHERE userId = '<uuid>';
```

#### Sessions / reset tokens
- Sessions are cleaned daily at 03:00 (expired and inactive).
- `PasswordResetToken` rows expire after 2 hours and are deleted on use.
- Refresh token reuse is treated as theft and revokes the whole session.

### Realtime (SSE) behind Nginx

Buffering must be disabled for the stream to flush events:

```nginx
location /api/v1/realtime/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 1h;
    add_header X-Accel-Buffering no;
}
```

The hub is in-process. With multiple backend replicas, route the same user to
the same replica or replace the hub with Redis pub/sub.

### Uploads

Files live under `UPLOAD_DIR` (default `<cwd>/uploads`). Back up that directory
alongside MySQL; it is not part of the database dump.

```bash
tar -czf uploads_$(date +%Y%m%d).tar.gz -C /var/lib/perfect-template uploads
```

### Troubleshooting

#### Servidor não inicia
1. Verificar variáveis de ambiente
2. Verificar conexão com banco de dados
3. Verificar portas disponíveis
4. Checar logs de erro

#### Alta latência
1. Verificar métricas de database
2. Analisar queries lentas
3. Verificar uso de memória

#### Erros 500
1. Checar logs com correlation ID
2. Verificar stack trace
3. Verificar conexões com serviços externos
4. Verificar uso de recursos

### Database Operations

#### Migrations
```bash
cd backend
npx prisma migrate dev --name migration_name
npx prisma migrate deploy  # Produção
```

#### Seed
```bash
npm run db-seed
```

#### Backup
```bash
# MySQL
docker exec perfect-template-db mysqldump -u user -ppassword perfect_template > backup.sql

# Restore
docker exec -i perfect-template-db mysql -u user -ppassword perfect_template < backup.sql
```

### Performance Tuning

#### Database Connection Pool
```typescript
// prisma.config.ts
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  pool_timeout = 20
  connection_limit = 10
}
```

### Security Incidents

#### Suspeita de Breach
1. Isolar o sistema
2. Coletar logs
3. Analisar correlation IDs suspeitos
4. Verificar acessos não autorizados
5. Rotacionar secrets

#### Rate Limit Atingido
1. Verificar IP do atacante
2. Analisar padrão de requisições
3. Bloquear IP se necessário
4. Ajustar limites se legítimo

### Deployment

#### Checklist Pré-Deploy
- [ ] Testes passando
- [ ] Migrations testadas
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do banco de dados
- [ ] Health checks funcionando

#### Deploy
```bash
# Build
docker-compose build

# Deploy
docker-compose up -d

# Verificar
curl http://localhost:3001/health
```

#### Rollback
```bash
# Voltar para versão anterior
docker-compose down
git checkout <previous-tag>
docker-compose up -d
```

### Contacts

- **On-call**: [phone]
- **DevOps**: [email]
- **Security**: security@example.com
