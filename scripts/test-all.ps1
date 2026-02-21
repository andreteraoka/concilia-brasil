#!/usr/bin/env pwsh
# Master test script - Tests all Azure services integration

param(
    [switch]$SkipOCR,
    [switch]$SkipOpenAI,
    [switch]$SkipPipeline,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     CONCÍLIA BRASIL - Azure Services Integration Test      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$results = @{
    OCR = $null
    OpenAI = $null
    Pipeline = $null
}

# Test 1: Document Intelligence (OCR)
if (-not $SkipOCR) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "1️⃣  TESTE: Document Intelligence (OCR)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    try {
        & "$PSScriptRoot\test-ocr.ps1"
        $results.OCR = "✅ PASSOU"
        Write-Host "`n✅ OCR Test: PASSOU`n" -ForegroundColor Green
    } catch {
        $results.OCR = "❌ FALHOU"
        Write-Host "`n❌ OCR Test: FALHOU" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host $_.ScriptStackTrace -ForegroundColor Gray
        }
    }
} else {
    $results.OCR = "⏭️  PULADO"
    Write-Host "⏭️  OCR Test: PULADO`n" -ForegroundColor Yellow
}

# Test 2: Azure OpenAI
if (-not $SkipOpenAI) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "2️⃣  TESTE: Azure OpenAI (Classificação)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    try {
        & "$PSScriptRoot\test-openai.ps1"
        $results.OpenAI = "✅ PASSOU"
        Write-Host "`n✅ OpenAI Test: PASSOU`n" -ForegroundColor Green
    } catch {
        $results.OpenAI = "❌ FALHOU"
        Write-Host "`n❌ OpenAI Test: FALHOU" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host $_.ScriptStackTrace -ForegroundColor Gray
        }
    }
} else {
    $results.OpenAI = "⏭️  PULADO"
    Write-Host "⏭️  OpenAI Test: PULADO`n" -ForegroundColor Yellow
}

# Test 3: Full Pipeline
if (-not $SkipPipeline) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "3️⃣  TESTE: Pipeline Completa (Ingestão)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    try {
        # Verificar se há arquivos no input
        if (-not (Test-Path ".\input\*")) {
            Write-Host "⚠️  Sem arquivos em .\input\ - criando arquivo de teste..." -ForegroundColor Yellow
            New-Item -Path ".\input" -ItemType Directory -Force | Out-Null
            @"
Banco Bradesco S.A.
Extrato Bancário - Teste

Saldo: R$ 10.000,00
"@ | Out-File -FilePath ".\input\test.txt" -Encoding utf8
        }

        Write-Host "🚀 Executando: npm run ingest -- --max-files 2 --upload false`n" -ForegroundColor Cyan
        
        $ingestOutput = & npm run ingest -- --max-files 2 --upload false 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $results.Pipeline = "✅ PASSOU"
            Write-Host "`n✅ Pipeline Test: PASSOU`n" -ForegroundColor Green
            
            # Mostrar outputs gerados
            if (Test-Path ".\output\*.json") {
                $outputFiles = Get-ChildItem ".\output\*.json" | Select-Object -First 3
                Write-Host "📦 Arquivos gerados:" -ForegroundColor Cyan
                foreach ($file in $outputFiles) {
                    Write-Host "   - $($file.Name) ($([math]::Round($file.Length/1KB, 2)) KB)" -ForegroundColor White
                }
            }
        } else {
            $results.Pipeline = "❌ FALHOU"
            Write-Host "`n❌ Pipeline Test: FALHOU" -ForegroundColor Red
            Write-Host $ingestOutput -ForegroundColor Yellow
        }
    } catch {
        $results.Pipeline = "❌ FALHOU"
        Write-Host "`n❌ Pipeline Test: FALHOU" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host $_.ScriptStackTrace -ForegroundColor Gray
        }
    }
} else {
    $results.Pipeline = "⏭️  PULADO"
    Write-Host "⏭️  Pipeline Test: PULADO`n" -ForegroundColor Yellow
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      RESUMO DOS TESTES                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📊 Resultados:" -ForegroundColor Cyan
Write-Host "   Document Intelligence: $($results.OCR)" -ForegroundColor White
Write-Host "   Azure OpenAI:          $($results.OpenAI)" -ForegroundColor White
Write-Host "   Pipeline Completa:     $($results.Pipeline)" -ForegroundColor White

$totalTests = ($results.Values | Where-Object { $_ -match "PASSOU|FALHOU" }).Count
$passedTests = ($results.Values | Where-Object { $_ -match "PASSOU" }).Count
$failedTests = ($results.Values | Where-Object { $_ -match "FALHOU" }).Count

Write-Host "`n📈 Estatísticas:" -ForegroundColor Cyan
Write-Host "   Total:   $totalTests testes" -ForegroundColor White
Write-Host "   Passou:  $passedTests ✅" -ForegroundColor Green
Write-Host "   Falhou:  $failedTests ❌" -ForegroundColor $(if ($failedTests -gt 0) { "Red" } else { "White" })

if ($failedTests -eq 0 -and $totalTests -gt 0) {
    Write-Host "`n🎉 TODOS OS TESTES PASSARAM! Sistema operacional." -ForegroundColor Green
} elseif ($failedTests -gt 0) {
    Write-Host "`n⚠️  ALGUNS TESTES FALHARAM. Verifique a configuração." -ForegroundColor Yellow
    Write-Host "   Execute com -Verbose para mais detalhes" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "`n⚠️  Nenhum teste executado." -ForegroundColor Yellow
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
