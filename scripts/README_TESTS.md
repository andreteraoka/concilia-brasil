# 🧪 Scripts de Teste Azure

## 📋 Visão Geral

Scripts prontos para testar a integração completa dos serviços Azure (OCR + AI) usados na pipeline de ingestão.

---

## 🎯 Scripts Disponíveis

| Script | Descrição | Uso |
|--------|-----------|-----|
| `test-ocr.ps1` | Testa Azure Document Intelligence (OCR) | `.\scripts\test-ocr.ps1` |
| `test-openai.ps1` | Testa Azure OpenAI (classificação) | `.\scripts\test-openai.ps1` |
| `test-all.ps1` | Executa todos os testes + pipeline | `.\scripts\test-all.ps1` |

---

## ⚙️ Configuração Inicial

### 1. Configurar variáveis de ambiente

**Windows PowerShell**:
```powershell
# Document Intelligence
$env:AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://seu-recurso.cognitiveservices.azure.com/"
$env:AZURE_DOCUMENT_INTELLIGENCE_KEY="sua-chave-aqui"
$env:AZURE_DOCUMENT_INTELLIGENCE_API_VERSION="2024-11-30"

# Azure OpenAI
$env:AZURE_OPENAI_ENDPOINT="https://seu-recurso.openai.azure.com/"
$env:AZURE_OPENAI_API_KEY="sua-chave-aqui"
$env:AZURE_OPENAI_DEPLOYMENT="gpt-4"
$env:AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

**Ou criar arquivo `.env.local`** (recomendado):
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION=2024-11-30

AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

---

## 🚀 Uso dos Scripts

### Teste Individual: OCR

```powershell
# Testar Document Intelligence (OCR)
.\scripts\test-ocr.ps1

# Resultado esperado:
# ✅ Documento enviado com sucesso!
# ✅ Processamento concluído!
# 📄 Conteúdo extraído: ...
```

### Teste Individual: OpenAI

```powershell
# Testar classificação com Azure OpenAI
.\scripts\test-openai.ps1

# Resultado esperado:
# ✅ Resposta recebida!
# 📊 Resultado da Classificação:
#    Tipo: BANK_STATEMENT
#    Confiança: 0.95
```

### Teste Completo (Recomendado)

```powershell
# Executar todos os testes + pipeline
.\scripts\test-all.ps1

# Opções:
.\scripts\test-all.ps1 -SkipOCR        # Pular teste OCR
.\scripts\test-all.ps1 -SkipOpenAI     # Pular teste OpenAI
.\scripts\test-all.ps1 -SkipPipeline   # Pular teste pipeline
.\scripts\test-all.ps1 -Verbose        # Modo detalhado

# Resultado esperado:
# ✅ TODOS OS TESTES PASSARAM! Sistema operacional.
```

---

## 📊 Interpretando Resultados

### ✅ Sucesso

```
╔════════════════════════════════════════════════════════════╗
║                      RESUMO DOS TESTES                      ║
╚════════════════════════════════════════════════════════════╝

📊 Resultados:
   Document Intelligence: ✅ PASSOU
   Azure OpenAI:          ✅ PASSOU
   Pipeline Completa:     ✅ PASSOU

📈 Estatísticas:
   Total:   3 testes
   Passou:  3 ✅
   Falhou:  0 ❌

🎉 TODOS OS TESTES PASSARAM! Sistema operacional.
```

### ❌ Falha Comum: Variáveis não configuradas

```
❌ Erro: Variáveis de ambiente não configuradas
Configure: AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT e AZURE_DOCUMENT_INTELLIGENCE_KEY
```

**Solução**: Configurar variáveis de ambiente ou criar `.env.local`

### ❌ Falha Comum: Recurso não provisionado

```
❌ Erro ao processar documento:
Detalhes: {"error":{"code":"ResourceNotFound","message":"..."}}
```

**Solução**: Provisionar recursos Azure seguindo [AZURE_CLI_USAGE.md](../AZURE_CLI_USAGE.md)

---

## 🔧 Solução de Problemas

### Problema: Scripts não executam

```powershell
# Habilitar execução de scripts (PowerShell como Admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problema: Erro 401 Unauthorized

**Causa**: Chave inválida ou expirada

**Solução**:
```powershell
# Regenerar chave via Azure CLI
az cognitiveservices account keys regenerate `
  --name seu-recurso `
  --resource-group seu-rg `
  --key-name key2

# Atualizar .env.local com nova chave
```

### Problema: Erro 429 Too Many Requests

**Causa**: Quota excedida

**Solução**:
```powershell
# Verificar quota
az cognitiveservices account list-usage `
  --name seu-recurso `
  --resource-group seu-rg

# Aumentar quota ou aguardar reset
```

---

## 📦 Estrutura de Saída

### OCR Test

```
input/
  └─ test-document.txt         # Arquivo de teste (auto-criado)

output/                        # (não gerado pelo test-ocr)
```

### Pipeline Test

```
input/
  ├─ test.txt
  └─ outros-documentos.pdf

output/
  ├─ abc123...def_test.json           # Resultado processado
  └─ xyz789...uvw_outros.json
```

**Formato do JSON**:
```json
{
  "id": "sha256-hash",
  "extraction": { "method": "document_intelligence", "text": "..." },
  "semanticValidation": { "is_valid": true, "confidence": 0.87 },
  "routeClassification": { "doc_type": "BANK_STATEMENT" },
  "persistencePayload": { "companyId": "...", "transactions": [...] }
}
```

---

## 🎯 Checklist de Validação

Antes de usar em produção:

- [ ] Testes OCR executados com sucesso
- [ ] Testes OpenAI executados com sucesso
- [ ] Pipeline completa testada com documentos reais
- [ ] Variáveis salvas em `.env.local` (local) ou App Service (produção)
- [ ] Quotas verificadas no Azure Portal
- [ ] Custos monitorados (Document Intelligence + OpenAI)
- [ ] Logs configurados para auditoria

---

## 💰 Estimativa de Custos

### Document Intelligence (OCR)

- **Preço**: ~$1.50 por 1.000 páginas
- **Exemplo**: 10.000 docs/mês = ~$15/mês

### Azure OpenAI (GPT-4)

- **Preço**: ~$0.03 por 1K tokens input, ~$0.06 por 1K tokens output
- **Exemplo**: 10.000 classificações (média 500 tokens) = ~$250/mês

**Total estimado**: ~$265/mês para 10.000 documentos

💡 **Dica**: Use fallback local para reduzir custos em ambientes de desenvolvimento

---

## 🔄 Automação CI/CD

### GitHub Actions

Adicionar step no workflow:

```yaml
- name: Test Azure Services
  env:
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: ${{ secrets.AZURE_DOC_INTEL_ENDPOINT }}
    AZURE_DOCUMENT_INTELLIGENCE_KEY: ${{ secrets.AZURE_DOC_INTEL_KEY }}
    AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
    AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_KEY }}
  run: |
    pwsh -File scripts/test-all.ps1
```

---

## 📚 Referências

- [AZURE_CLI_USAGE.md](../AZURE_CLI_USAGE.md) - Guia completo Azure CLI
- [MICROSOFT_AUTH_IMPLEMENTATION.md](../MICROSOFT_AUTH_IMPLEMENTATION.md) - Autenticação Microsoft
- [Pipeline de Ingestão](../src/modules/documents/pipeline/) - Código fonte

---

## 📞 Suporte

**Problemas com scripts**:
- Verificar logs em `.\output\errors.log`
- Executar com `-Verbose` para debug
- Validar credenciais Azure

**Problemas com Azure**:
- [Azure Portal](https://portal.azure.com)
- [Azure Status](https://status.azure.com/)
- [Azure Support](https://azure.microsoft.com/support/)

---

**Última atualização**: 2026-02-20  
**Status**: ✅ Testados e validados  
**Plataforma**: Windows PowerShell 5.1+
