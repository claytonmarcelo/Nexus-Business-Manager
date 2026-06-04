# Monitoramento - Nexus Business Manager

## Health Check
Endpoint: `GET /api/health`

Retorna status do servidor e banco de dados:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "database": { "ok": true, "latencyMs": 2 },
  "system": {
    "uptime": 3600,
    "memory": { ... },
    "nodeVersion": "v20.x",
    "platform": "linux"
  }
}
```

## Logs
- Localização: `backend/logs/app.log`
- Formato: JSON estruturado (pino)
- Rotação: gerenciada via pino (ou logrotate externo)

### Níveis de log
| Nível  | Uso                              |
|--------|----------------------------------|
| error  | Erros não recuperáveis           |
| warn   | Situações anormais               |
| info   | Eventos importantes (login, etc) |
| debug  | Detalhamento para dev            |

## Alertas sugeridos
- Health check retornando `degraded` → notificar equipe
- Latência do banco > 500ms → investigar queries lentas
- Uso de memória > 80% → escalar servidor
- Backup falhando → verificar mysqldump

## Ferramentas recomendadas
- **Uptime Kuma**: monitoramento de health check (auto-hospedado, gratuito)
- **Better Stack**: heartbeat + logs (plano gratuito generoso)
- **Prometheus + Grafana**: monitoramento avançado (auto-hospedado)
- **Pino**: logs estruturados prontos para ingestão por Loki/ELK
