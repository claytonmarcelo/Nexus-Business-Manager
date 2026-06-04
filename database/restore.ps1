# restore.ps1 - Restaura dump do banco MySQL no Windows
# Uso: .\database\restore.ps1 -RestoreFile ".\database\backups\nexus_business_manager_20260604_120000.sql.gz"

param(
  [Parameter(Mandatory = $true)]
  [string]$RestoreFile
)

if (-not (Test-Path -LiteralPath $RestoreFile)) {
  Write-Host "Erro: arquivo $RestoreFile nao encontrado" -ForegroundColor Red
  exit 1
}

$ProjectDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path -Path $ProjectDir -ChildPath "backend\.env"

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

Write-Host "Restaurando banco $DbName a partir de $RestoreFile..." -ForegroundColor Cyan
Write-Host "Host: $DbHost`:$DbPort"
Write-Host "ATENCAO: Isso substituira todos os dados do banco $DbName!" -ForegroundColor Yellow

$Confirm = Read-Host "Continuar? (s/N)"
if ($Confirm -ne "s" -and $Confirm -ne "S") {
  Write-Host "Operacao cancelada."
  exit 0
}

# Descomprimir se necessario
$inputFile = $RestoreFile
$tempFile = ""
if ($RestoreFile -like "*.gz") {
  $tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
  & "gzip" -d -c $RestoreFile | Out-File -FilePath $tempFile -Encoding utf8NoBOM
  $inputFile = $tempFile
}

$mysqlArgs = @("-h", $DbHost, "-P", $DbPort, "-u", $DbUser)
if ($DbPass) { $mysqlArgs += "-p$DbPass" }
$mysqlArgs += $DbName

Get-Content -Path $inputFile -Raw | & "mysql" $mysqlArgs

if ($tempFile -and (Test-Path -LiteralPath $tempFile)) {
  Remove-Item -LiteralPath $tempFile -Force
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "Restauracao concluida com sucesso!" -ForegroundColor Green
} else {
  Write-Host "Erro durante a restauracao!" -ForegroundColor Red
  exit 1
}
