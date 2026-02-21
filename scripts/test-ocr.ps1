#!/usr/bin/env pwsh
# Test Azure Document Intelligence (OCR) service

Write-Host "📄 Testando Azure Document Intelligence (OCR)..." -ForegroundColor Cyan

# Verificar variáveis de ambiente
$endpoint = $env:AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
$key = $env:AZURE_DOCUMENT_INTELLIGENCE_KEY
$apiVersion = if ($env:AZURE_DOCUMENT_INTELLIGENCE_API_VERSION) { $env:AZURE_DOCUMENT_INTELLIGENCE_API_VERSION } else { "2024-11-30" }

if (-not $endpoint -or -not $key) {
    Write-Host "❌ Erro: Variáveis de ambiente não configuradas" -ForegroundColor Red
    Write-Host "Configure: AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT e AZURE_DOCUMENT_INTELLIGENCE_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Variáveis configuradas" -ForegroundColor Green
Write-Host "   Endpoint: $endpoint" -ForegroundColor Gray

# Verificar se há arquivo de teste
$testFile = ".\input\test-document.pdf"
if (-not (Test-Path $testFile)) {
    # Criar arquivo de teste simples
    Write-Host "⚠️  Arquivo de teste não encontrado. Criando texto exemplo..." -ForegroundColor Yellow
    $testFile = ".\input\test-document.txt"
    New-Item -Path ".\input" -ItemType Directory -Force | Out-Null
    @"
Banco Bradesco S.A.
Extrato Bancário - Janeiro 2026

Agência: 1234-5
Conta Corrente: 98765-4

Período: 01/01/2026 a 31/01/2026

Saldo Anterior: R$ 10.000,00

Lançamentos:
15/01/2026 - Depósito - R$ 5.000,00 (C)
20/01/2026 - TED - R$ 2.500,00 (D)
25/01/2026 - Pagamento - R$ 1.000,00 (D)

Saldo Final: R$ 11.500,00
"@ | Out-File -FilePath $testFile -Encoding utf8
    Write-Host "✅ Arquivo criado: $testFile" -ForegroundColor Green
}

# Ler arquivo
$fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $testFile))
$contentType = if ($testFile.EndsWith(".pdf")) { "application/pdf" } else { "text/plain" }

Write-Host "`n🚀 Enviando documento para análise..." -ForegroundColor Cyan

# Fazer request POST
$analyzeUrl = "$endpoint/formrecognizer/documentModels/prebuilt-document:analyze?api-version=$apiVersion"

try {
    $response = Invoke-WebRequest -Uri $analyzeUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = $contentType
            "Ocp-Apim-Subscription-Key" = $key
        } `
        -Body $fileBytes `
        -ErrorAction Stop

    $operationLocation = $response.Headers["Operation-Location"]
    
    if (-not $operationLocation) {
        Write-Host "❌ Erro: Operation-Location não retornado" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Documento enviado com sucesso!" -ForegroundColor Green
    Write-Host "   Operation ID: $operationLocation" -ForegroundColor Gray

    # Poll resultado
    Write-Host "`n⏳ Aguardando processamento (5s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    $resultResponse = Invoke-RestMethod -Uri $operationLocation `
        -Method GET `
        -Headers @{
            "Ocp-Apim-Subscription-Key" = $key
        }

    $status = $resultResponse.status
    Write-Host "`n📊 Status: $status" -ForegroundColor Cyan

    if ($status -eq "succeeded") {
        Write-Host "✅ Processamento concluído!" -ForegroundColor Green
        
        $content = $resultResponse.analyzeResult.content
        Write-Host "`n📄 Conteúdo extraído (primeiras 500 chars):" -ForegroundColor Cyan
        Write-Host $content.Substring(0, [Math]::Min(500, $content.Length)) -ForegroundColor White
        
        Write-Host "`n✅ Teste de OCR concluído com sucesso!" -ForegroundColor Green
    }
    elseif ($status -eq "running") {
        Write-Host "⏳ Ainda processando. Execute novamente em alguns segundos." -ForegroundColor Yellow
        Write-Host "   Ou use o Operation ID para verificar: $operationLocation" -ForegroundColor Gray
    }
    else {
        Write-Host "❌ Status inesperado: $status" -ForegroundColor Red
    }

} catch {
    Write-Host "`n❌ Erro ao processar documento:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Detalhes: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}
