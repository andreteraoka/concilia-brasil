#!/usr/bin/env pwsh
# Script para atribuir usuário ao app via Microsoft Graph

$appObjectId = "6b30d508-8b4f-445c-85ef-68b492cb3166"
$userId = "7aa1fe85-f790-4af9-967a-b6da69f6fd4f"

$uri = "https://graph.microsoft.com/v1.0/servicePrincipals/$appObjectId/appRoleAssignments"

$body = @{
    principalId = $userId
    appRoleId = "00000000-0000-0000-0000-000000000000"
    resourceId = $appObjectId
} | ConvertTo-Json

Write-Host "URI: $uri"
Write-Host "Body: $body"

az rest --method POST --uri $uri --body $body
