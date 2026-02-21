# Script rápido para criar App Registration e salvar output
$ErrorActionPreference = "Continue"

# Get Tenant ID
az account show --query "tenantId" -o tsv > tenant-id.txt

# Create App Registration
az ad app create `
    --display-name "Concilia Brasil Auth" `
    --sign-in-audience "AzureADMyOrg" `
    --web-redirect-uris "http://localhost:3000/api/auth/callback/azure-ad" "https://concilia-brasil.azurewebsites.net/api/auth/callback/azure-ad" `
    --enable-id-token-issuance true `
    --query "{appId:appId,id:id}" -o json > app-registration.json

Write-Host "Done!"
