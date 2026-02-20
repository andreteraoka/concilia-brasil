# Script para configurar variáveis de ambiente no Azure App Service
# Uso: .\scripts\setup-azure-env.ps1 -ResourceGroup "seu-rg" -AppName "seu-app"

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$JwtSecret,
    
    [string]$OpenaiApiKey = "",
    [string]$AzureRegion = "eastus"
)

Write-Host "🔧 Configurando variáveis de ambiente no Azure..." -ForegroundColor Cyan

# Validar se az está instalado
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI não está instalado. Instale em: https://docs.microsoft.com/cli/azure" -ForegroundColor Red
    exit 1
}

# Validar se está logado
$account = az account show -o json | ConvertFrom-Json
if (-not $account) {
    Write-Host "❌ Não está logado no Azure. Execute: az login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logado como: $($account.user.name)" -ForegroundColor Green

# Coletar informações adicionais
if ([string]::IsNullOrEmpty($OpenaiApiKey)) {
    Write-Host ""
    $OpenaiApiKey = Read-Host "Enter OpenAI API Key (or press Enter to skip)"
}

# Configurar Application Settings
Write-Host ""
Write-Host "📝 Configurando Application Settings..." -ForegroundColor Yellow

$settings = @(
    "DATABASE_URL=$DatabaseUrl"
    "NODE_ENV=production"
    "JWT_SECRET=$JwtSecret"
    "STORAGE_PROVIDER=local"
    "AI_PROVIDER=openai"
    "LOG_LEVEL=info"
    "LOG_FORMAT=json"
    "APP_NAME=concilia-brasil"
    "RATE_LIMIT_ENABLED=true"
)

if (-not [string]::IsNullOrEmpty($OpenaiApiKey)) {
    $settings += "OPENAI_API_KEY=$OpenaiApiKey"
}

# Aplicar configurações
try {
    az webapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $AppName `
        --settings $settings `
        -o json | Out-Null
    
    Write-Host "✅ Application Settings configuradas com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erro ao configurar Application Settings: $_" -ForegroundColor Red
    exit 1
}

# Configurar startup file
Write-Host ""
Write-Host "⚙️  Configurando startup file..." -ForegroundColor Yellow

try {
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $AppName `
        --startup-file "npm start" `
        -o json | Out-Null
    
    Write-Host "✅ Startup file configurado!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erro ao configurar startup file: $_" -ForegroundColor Red
}

# Configurar Node version
Write-Host ""
Write-Host "🔄 Configurando Node.js 24.x..." -ForegroundColor Yellow

try {
    az webapp config set `
        --resource-group $ResourceGroup `
        --name $AppName `
        --linux-fx-version "NODE|24-lts" `
        -o json | Out-Null
    
    Write-Host "✅ Node.js 24 LTS configurado!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Não foi possível configurar versão do Node (pode já estar configurada)" -ForegroundColor Yellow
}

# Habilitar logs
Write-Host ""
Write-Host "📋 Habilitando Application Logs..." -ForegroundColor Yellow

try {
    az webapp log config `
        --resource-group $ResourceGroup `
        --name $AppName `
        --application-logging filesystem `
        --level information `
        -o json | Out-Null
    
    Write-Host "✅ Logs habilitados!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Não foi possível habilitar logs" -ForegroundColor Yellow
}

# Restaurar app
Write-Host ""
Write-Host "🔄 Reiniciando aplicação..." -ForegroundColor Yellow

try {
    az webapp restart `
        --resource-group $ResourceGroup `
        --name $AppName `
        -o json | Out-Null
    
    Write-Host "✅ Aplicação reiniciada!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Não foi possível reiniciar" -ForegroundColor Yellow
}

# Resumo
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Se for primeiro deploy, execute migrations: npm run prisma:migrate:deploy"
Write-Host "2. Acesse a aplicação em: https://$AppName.azurewebsites.net"
Write-Host "3. Ver logs ao vivo: az webapp log stream -g $ResourceGroup -n $AppName"
Write-Host ""
