# Backup and Restore - Nexus Business Manager

## Manual Backup

### Linux / macOS
```bash
bash database/backup.sh
```

### Windows
```powershell
.\database\backup.ps1
```

Backups are saved to `database/backups/` with the format `nexus_business_manager_YYYYMMDD_HHMMSS.sql.gz`.

## Manual Restore

### Linux / macOS
```bash
bash database/restore.sh database/backups/nexus_business_manager_20260604_120000.sql.gz
```

### Windows
```powershell
.\database\restore.ps1 -RestoreFile "database\backups\nexus_business_manager_20260604_120000.sql.gz"
```

## Automation with Cron (Linux)
```bash
# Daily backup at 03:00
0 3 * * * cd /path/to/nexus-business-manager && bash database/backup.sh

# Delete backups older than 30 days
0 4 * * * find /path/to/nexus-business-manager/database/backups -name '*.sql.gz' -mtime +30 -delete
```

## Automation with Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 03:00
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\nexus-business-manager\database\backup.ps1"`
