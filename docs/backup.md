# Backup e Restauração - Nexus Business Manager

## Backup Manual

### Linux / macOS
```bash
bash database/backup.sh
```

### Windows
```powershell
.\database\backup.ps1
```

Os backups são salvos em `database/backups/` com formato `nexus_business_manager_YYYYMMDD_HHMMSS.sql.gz`.

## Restauração Manual

### Linux / macOS
```bash
bash database/restore.sh database/backups/nexus_business_manager_20260604_120000.sql.gz
```

### Windows
```powershell
.\database\restore.ps1 -RestoreFile "database\backups\nexus_business_manager_20260604_120000.sql.gz"
```

## Automação com Cron (Linux)
```bash
# Backup diário às 03:00
0 3 * * * cd /caminho/para/nexus-business-manager && bash database/backup.sh

# Limpar backups com mais de 30 dias
0 4 * * * find /caminho/para/nexus-business-manager/database/backups -name '*.sql.gz' -mtime +30 -delete
```

## Automação com Agendador do Windows
1. Abra o Agendador de Tarefas
2. Criar tarefa básica
3. Gatilho: Diariamente às 03:00
4. Ação: Iniciar programa
   - Programa: `powershell.exe`
   - Argumentos: `-ExecutionPolicy Bypass -File "C:\nexus-business-manager\database\backup.ps1"`
