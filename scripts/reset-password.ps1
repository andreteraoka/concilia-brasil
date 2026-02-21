#!/usr/bin/env pwsh
# Script para atribuir usuário e resetar senha

# Credenciais
$appObjectId = "6b30d508-8b4f-445c-85ef-68b492cb3166"
$userId = "7aa1fe85-f790-4af9-967a-b6da69f6fd4f"
$newPassword = "&*djc9Y*2gcj2"

Write-Host "=== RESETANDO SENHA DO USUÁRIO ===" -ForegroundColor Cyan

# Usar Microsoft Graph para resetar senha
$passwordProfile = @{
    password = $newPassword
    forceChangePasswordNextSignIn = $false
}

$body = @{
    passwordProfile = $passwordProfile
} | ConvertTo-Json

$uri = "https://graph.microsoft.com/v1.0/users/$userId"

Write-Host "Atualizando senha..."
az rest --method PATCH --uri $uri --body $body

Write-Host "`n✅ Senha atualizada!" -ForegroundColor Green
Write-Host "Usuario: ateraoka_yahoo.com#EXT#@ateraokayahoo.onmicrosoft.com" -ForegroundColor Gray
Write-Host "Senha: $newPassword" -ForegroundColor Yellow
Write-Host "Aviso: Senha exposta acima - NÃO commitar em Git!" -ForegroundColor Red
