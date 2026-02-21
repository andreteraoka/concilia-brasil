#!/usr/bin/env pwsh
# Test Azure OpenAI classification service

Write-Host "🤖 Testando Azure OpenAI (Classificação)..." -ForegroundColor Cyan

# Verificar variáveis de ambiente
$endpoint = $env:AZURE_OPENAI_ENDPOINT
$key = $env:AZURE_OPENAI_API_KEY
$deployment = $env:AZURE_OPENAI_DEPLOYMENT
$apiVersion = if ($env:AZURE_OPENAI_API_VERSION) { $env:AZURE_OPENAI_API_VERSION } else { "2024-02-15-preview" }

if (-not $endpoint -or -not $key -or -not $deployment) {
    Write-Host "❌ Erro: Variáveis de ambiente não configuradas" -ForegroundColor Red
    Write-Host "Configure: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Variáveis configuradas" -ForegroundColor Green
Write-Host "   Endpoint: $endpoint" -ForegroundColor Gray
Write-Host "   Deployment: $deployment" -ForegroundColor Gray

# Texto de teste
$testText = @"
Banco Bradesco S.A.
Agência 1234-5
Conta Corrente 98765-4

Extrato Mensal - Janeiro 2026

Período: 01/01/2026 a 31/01/2026

Saldo Anterior: R$ 10.000,00

Lançamentos:
15/01/2026 - Depósito - R$ 5.000,00
20/01/2026 - TED Enviado - R$ 2.500,00
25/01/2026 - Pagamento Conta Luz - R$ 1.000,00

Saldo Final: R$ 11.500,00

Total de Créditos: R$ 5.000,00
Total de Débitos: R$ 3.500,00
"@

Write-Host "`n📝 Texto a ser classificado:" -ForegroundColor Cyan
Write-Host $testText.Substring(0, [Math]::Min(200, $testText.Length)) + "..." -ForegroundColor White

# Criar payload
$payload = @{
    messages = @(
        @{
            role = "system"
            content = "Você é um classificador de documentos financeiros. Retorne apenas JSON."
        },
        @{
            role = "user"
            content = "Classifique este documento financeiro e retorne JSON com {`"doc_type`": `"BANK_STATEMENT|INVOICE|BOLETO|RECEIPT|CONTRACT|OTHER`", `"confidence`": 0-1, `"reasoning`": `"explicação curta`"}: $testText"
        }
    )
    temperature = 0
    max_tokens = 200
    response_format = @{ type = "json_object" }
} | ConvertTo-Json -Depth 10

Write-Host "`n🚀 Enviando para Azure OpenAI..." -ForegroundColor Cyan

$chatUrl = "$endpoint/openai/deployments/$deployment/chat/completions?api-version=$apiVersion"

try {
    $response = Invoke-RestMethod -Uri $chatUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "api-key" = $key
        } `
        -Body $payload `
        -ErrorAction Stop

    Write-Host "✅ Resposta recebida!" -ForegroundColor Green

    $content = $response.choices[0].message.content
    $classification = $content | ConvertFrom-Json

    Write-Host "`n📊 Resultado da Classificação:" -ForegroundColor Cyan
    Write-Host "   Tipo: $($classification.doc_type)" -ForegroundColor White
    Write-Host "   Confiança: $($classification.confidence)" -ForegroundColor White
    Write-Host "   Razão: $($classification.reasoning)" -ForegroundColor White

    Write-Host "`n✅ Teste de classificação concluído com sucesso!" -ForegroundColor Green

    # Métricas de uso
    if ($response.usage) {
        Write-Host "`n📈 Uso de tokens:" -ForegroundColor Cyan
        Write-Host "   Prompt: $($response.usage.prompt_tokens)" -ForegroundColor Gray
        Write-Host "   Completion: $($response.usage.completion_tokens)" -ForegroundColor Gray
        Write-Host "   Total: $($response.usage.total_tokens)" -ForegroundColor Gray
    }

} catch {
    Write-Host "`n❌ Erro ao classificar documento:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Detalhes: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}
