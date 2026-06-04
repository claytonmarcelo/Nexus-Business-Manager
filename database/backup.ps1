# backup.ps1 - Realiza dump do banco MySQL no Windows
# Uso: .\database\backup.ps1

param(
  [string]$BackupDir = ""
)

$ProjectDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path -Path $ProjectDir -ChildPath "backend\.env"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not $BackupDir) {
  $BackupDir = Join-Path -Path $ProjectDir -ChildPath "database\backups"
}

if (-not (Test-Path -LiteralPath $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Load .env
$envVars = @{}
if (Test-Path -LiteralPath $EnvFile) {
  Get-Content -Path $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=["\']?(.*?)["\']?\s*$') {
      $envVars[$matches[1]] = $matches[2]
    }
  }
}

$DbHost = if ($envVars['DB_HOST']) { $envVars['DB_HOST'] } else { "localhost" }
$DbPort = if ($envVars['DB_PORT']) { $envVars['DB_PORT'] } else { "3306" }
$DbUser = if ($envVars['DB_USER']) { $envVars['DB_USER'] } else { "root" }
$DbPass = if ($envVars['DB_PASSWORD']) { $envVars['DB_PASSWORD'] } else { "" }
$DbName = if ($envVars['DB_NAME']) { $envVars['DB_NAME'] } else { "nexus_business_manager" }

$BackupFile = Join-Path -Path $BackupDir -ChildPath "${DbName}_${Timestamp}.sql"

Write-Host "Iniciando backup do banco $DbName..." -ForegroundColor Cyan
Write-Host "Host: $DbHost`:$DbPort"
Write-Host "Destino: $BackupFile"

$mysqldumpArgs = @(
  "-h", $DbHost,
  "-P", $DbPort,
  "-u", $DbUser,
  "--routines",
  "--triggers",
  "--single-transaction",
  "--quick",
  $DbName
)

if ($DbPass) {
  $mysqldumpArgs = @("-h", $DbHost, "-P", $DbPort, "-u", $DbUser, "-p$DbPass", "--routines", "--triggers", "--single-transaction", "--quick", $DbName)
}

& "mysqldump" $mysqldumpArgs | Out-File -FilePath $BackupFile -Encoding utf8NoBOM

if ($LASTEXITCODE -ne 0) {
  Write-Host "Erro ao executar mysqldump!" -ForegroundColor Red
  exit 1
}

# Compactar
& "gzip" -f $BackupFile 2>$null
if ($LASTEXITCODE -eq 0) {
  $CompressedFile = "${BackupFile}.gz"
  $Size = (Get-Item -LiteralPath $CompressedFile).Length / 1KB
  Write-Host "Backup concluido: $CompressedFile ($([math]::Round($Size, 2)) KB)" -ForegroundColor Green
} else {
  Write-Host "Backup concluido (sem compressao): $BackupFile" -ForegroundColor Yellow
}
