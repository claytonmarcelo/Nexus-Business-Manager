# Monitoring - Nexus Business Manager

## Health Check
Endpoint: `GET /api/health`

Returns server and database status:
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
- Location: `backend/logs/app.log`
- Format: Structured JSON (pino)
- Rotation: Managed via pino (or external logrotate)

### Log levels
| Level | Usage                            |
|-------|----------------------------------|
| error | Unrecoverable errors             |
| warn  | Abnormal situations              |
| info  | Important events (login, etc)    |
| debug | Development details              |

## Suggested Alerts
- Health check returning `degraded` → notify team
- Database latency > 500ms → investigate slow queries
- Memory usage > 80% → scale server
- Backup failing → check mysqldump

## Recommended Tools
- **Uptime Kuma**: health check monitoring (self-hosted, free)
- **Better Stack**: heartbeat + logs (generous free plan)
- **Prometheus + Grafana**: advanced monitoring (self-hosted)
- **Pino**: structured logs ready for Loki/ELK ingestion
