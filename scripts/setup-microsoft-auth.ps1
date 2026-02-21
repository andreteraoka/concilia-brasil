#!/usr/bin/env pwsh
# Script de Setup Automático - Microsoft Authentication
# Concilia Brasil - Azure Integration

$ErrorActionPreference = "Stop"

Write-Host "🚀 SETUP AUTOMÁTICO - MICROSOFT AUTHENTICATION" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Verificar Login no Azure
# ============================================================================
Write-Host "📋 STEP 1: Verificando login no Azure CLI..." -ForegroundColor Yellow

try {
    $account = az account show 2>$null | ConvertFrom-Json
    $tenantId = $account.tenantId
    $subscriptionId = $account.id
    $subscriptionName = $account.name
    
    Write-Host "✅ Logado no Azure!" -ForegroundColor Green
    Write-Host "   Subscription: $subscriptionName" -ForegroundColor Gray
    Write-Host "   Tenant ID: $tenantId" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ ERRO: Não está logado no Azure CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  AÇÃO NECESSÁRIA:" -ForegroundColor Yellow
    Write-Host "   Execute: az login" -ForegroundColor White
    Write-Host "   Depois rode este script novamente." -ForegroundColor White
    exit 1
}

# ============================================================================
# STEP 2: Criar App Registration
# ============================================================================
Write-Host "📋 STEP 2: Criando App Registration..." -ForegroundColor Yellow

$appName = "Concilia Brasil Auth"
$redirectUriLocal = "http://localhost:3000/api/auth/callback/azure-ad"
$redirectUriProd = "https://concilia-brasil.azurewebsites.net/api/auth/callback/azure-ad"

# Verificar se app já existe
$existingApp = az ad app list --display-name $appName 2>$null | ConvertFrom-Json

if ($existingApp.Count -gt 0) {
    Write-Host "⚠️  App '$appName' já existe. Usando existente..." -ForegroundColor Yellow
    $appId = $existingApp[0].appId
    $objectId = $existingApp[0].id
    Write-Host "   App ID: $appId" -ForegroundColor Gray
}
else {
    Write-Host "   Criando novo App Registration..." -ForegroundColor Gray
    
    # Criar app com redirect URIs
    $app = az ad app create `
        --display-name $appName `
        --sign-in-audience "AzureADMyOrg" `
        --web-redirect-uris $redirectUriLocal $redirectUriProd `
        --enable-id-token-issuance true `
        2>$null | ConvertFrom-Json
    
    $appId = $app.appId
    $objectId = $app.id
    
    Write-Host "✅ App Registration criado!" -ForegroundColor Green
    Write-Host "   App ID (Client ID): $appId" -ForegroundColor Gray
    Write-Host "   Object ID: $objectId" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# STEP 3: Configurar API Permissions
# ============================================================================
Write-Host "📋 STEP 3: Configurando API Permissions..." -ForegroundColor Yellow

# Microsoft Graph API ID
$graphApiId = "00000003-0000-0000-c000-000000000000"

# Permissions necessárias (Delegated)
# - User.Read (e1fe6dd8-ba31-4d61-89e7-88639da4683d)
# - openid (37f7f235-527c-4136-accd-4a02d197296e)
# - profile (14dad69e-099b-42c9-810b-d002981feec1)
# - email (64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0)

Write-Host "   Adicionando permissões Microsoft Graph..." -ForegroundColor Gray

$permissions = @(
    @{ id = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"; type = "Scope" } # User.Read
    @{ id = "37f7f235-527c-4136-accd-4a02d197296e"; type = "Scope" } # openid
    @{ id = "14dad69e-099b-42c9-810b-d002981feec1"; type = "Scope" } # profile
    @{ id = "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0"; type = "Scope" } # email
)

$requiredResourceAccess = @{
    resourceAppId = $graphApiId
    resourceAccess = $permissions
} | ConvertTo-Json -Compress -Depth 10

# Atualizar required resource access
az ad app update --id $objectId --required-resource-accesses "[$requiredResourceAccess]" 2>$null

Write-Host "✅ API Permissions configuradas!" -ForegroundColor Green
Write-Host "   ⚠️  ATENÇÃO: Admin consent será necessário (veja instruções abaixo)" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 4: Criar Client Secret
# ============================================================================
Write-Host "📋 STEP 4: Criando Client Secret..." -ForegroundColor Yellow

$secretName = "Concilia-Production-Secret-$(Get-Date -Format 'yyyyMMdd')"
$secretExpiry = (Get-Date).AddMonths(24).ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "   Gerando novo secret (válido por 24 meses)..." -ForegroundColor Gray

$secret = az ad app credential reset `
    --id $objectId `
    --append `
    --display-name $secretName `
    --years 2 `
    2>$null | ConvertFrom-Json

$clientSecret = $secret.password

Write-Host "✅ Client Secret criado!" -ForegroundColor Green
Write-Host "   ⚠️  IMPORTANTE: Este secret será mostrado apenas UMA VEZ!" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 5: Gerar NEXTAUTH_SECRET
# ============================================================================
Write-Host "📋 STEP 5: Gerando NEXTAUTH_SECRET..." -ForegroundColor Yellow

$bytes = New-Object Byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$nextAuthSecret = [Convert]::ToBase64String($bytes)

Write-Host "✅ NEXTAUTH_SECRET gerado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 6: Criar .env.local
# ============================================================================
Write-Host "📋 STEP 6: Criando arquivo .env.local..." -ForegroundColor Yellow

$envContent = @"
# -------------------------
# Microsoft Authentication (Azure AD)
# -------------------------
AZURE_AD_CLIENT_ID=$appId
AZURE_AD_CLIENT_SECRET=$clientSecret
AZURE_AD_TENANT_ID=$tenantId
ADMIN_EMAIL=ateraoka@yahoo.com

# -------------------------
# NextAuth
# -------------------------
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$nextAuthSecret

# -------------------------
# Database & JWT (COPIE do seu .env existente)
# -------------------------
# JWT_SECRET=...
# DATABASE_URL=...
# ... outras variáveis ...
"@

$envLocalPath = Join-Path $PSScriptRoot ".env.local"
Set-Content -Path $envLocalPath -Value $envContent -Encoding UTF8

Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
Write-Host "   Localização: $envLocalPath" -ForegroundColor Gray
Write-Host "   ⚠️  ATENÇÃO: Complete com as variáveis do seu .env existente!" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 7: Buscar Resource Group e App Service
# ============================================================================
Write-Host "📋 STEP 7: Buscando Azure App Service..." -ForegroundColor Yellow

Write-Host "   Procurando App Service 'concilia-brasil'..." -ForegroundColor Gray

$webApps = az webapp list 2>$null | ConvertFrom-Json
$webapp = $webApps | Where-Object { $_.name -eq "concilia-brasil" }

if ($webapp) {
    $resourceGroup = $webapp.resourceGroup
    $webappName = $webapp.name
    
    Write-Host "✅ App Service encontrado!" -ForegroundColor Green
    Write-Host "   Nome: $webappName" -ForegroundColor Gray
    Write-Host "   Resource Group: $resourceGroup" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "⚠️  App Service 'concilia-brasil' não encontrado." -ForegroundColor Yellow
    Write-Host "   Pulando configuração do App Service..." -ForegroundColor Gray
    Write-Host ""
    $resourceGroup = $null
}

# ============================================================================
# STEP 8: Configurar Azure App Service (se encontrado)
# ============================================================================
if ($resourceGroup) {
    Write-Host "📋 STEP 8: Configurando variáveis no Azure App Service..." -ForegroundColor Yellow
    
    Write-Host "   Adicionando variáveis de ambiente..." -ForegroundColor Gray
    
    az webapp config appsettings set `
        --resource-group $resourceGroup `
        --name $webappName `
        --settings `
            "AZURE_AD_CLIENT_ID=$appId" `
            "AZURE_AD_CLIENT_SECRET=$clientSecret" `
            "AZURE_AD_TENANT_ID=$tenantId" `
            "ADMIN_EMAIL=ateraoka@yahoo.com" `
            "NEXTAUTH_URL=https://concilia-brasil.azurewebsites.net" `
            "NEXTAUTH_SECRET=$nextAuthSecret" `
        --output none 2>$null
    
    Write-Host "✅ Variáveis configuradas no Azure App Service!" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# RESUMO FINAL
# ============================================================================
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "🎉 SETUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 CREDENCIAIS GERADAS:" -ForegroundColor Yellow
Write-Host "   AZURE_AD_CLIENT_ID:     $appId" -ForegroundColor White
Write-Host "   AZURE_AD_CLIENT_SECRET: $clientSecret" -ForegroundColor White
Write-Host "   AZURE_AD_TENANT_ID:     $tenantId" -ForegroundColor White
Write-Host "   NEXTAUTH_SECRET:        $nextAuthSecret" -ForegroundColor White
Write-Host ""

Write-Host "📂 ARQUIVOS CRIADOS:" -ForegroundColor Yellow
Write-Host "   ✅ .env.local (complete com variáveis do .env existente)" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  AÇÕES MANUAIS NECESSÁRIAS NO PORTAL DO AZURE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  CONCEDER ADMIN CONSENT (OBRIGATÓRIO):" -ForegroundColor Cyan
Write-Host "   a) Acesse: https://portal.azure.com" -ForegroundColor White
Write-Host "   b) Vá em: Microsoft Entra ID > App registrations" -ForegroundColor White
Write-Host "   c) Procure: '$appName'" -ForegroundColor White
Write-Host "   d) Clique em: API permissions" -ForegroundColor White
Write-Host "   e) Clique em: '✓ Grant admin consent for [Seu Tenant]'" -ForegroundColor White
Write-Host "   f) Confirme clicando em 'Yes'" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  ATRIBUIR USUÁRIO ADMIN (OBRIGATÓRIO):" -ForegroundColor Cyan
Write-Host "   a) Vá em: Microsoft Entra ID > Enterprise applications" -ForegroundColor White
Write-Host "   b) Procure: '$appName'" -ForegroundColor White
Write-Host "   c) Clique em: Users and groups" -ForegroundColor White
Write-Host "   d) Clique em: '+ Add user/group'" -ForegroundColor White
Write-Host "   e) Selecione: ateraoka@yahoo.com" -ForegroundColor White
Write-Host "   f) Clique em: 'Assign'" -ForegroundColor White
Write-Host ""

Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Complete o arquivo .env.local com variáveis do .env existente" -ForegroundColor White
Write-Host "   2. Execute as 2 ações manuais no Portal do Azure (acima)" -ForegroundColor White
Write-Host "   3. Teste localmente: npm run dev" -ForegroundColor White
Write-Host "   4. Faça deploy: git add .; git commit -m 'feat: Microsoft Auth'; git push" -ForegroundColor White
Write-Host ""

Write-Host "🔗 LINKS ÚTEIS:" -ForegroundColor Yellow
Write-Host "   Portal Azure:        https://portal.azure.com" -ForegroundColor White
Write-Host "   App Registration:    https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/$appId" -ForegroundColor White
Write-Host "   Enterprise App:      https://portal.azure.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview" -ForegroundColor White
Write-Host ""

Write-Host "✅ Setup automático concluído!" -ForegroundColor Green
Write-Host "   Siga as ações manuais acima para finalizar." -ForegroundColor Gray
Write-Host ""
