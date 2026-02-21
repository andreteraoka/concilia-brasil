# 🔧 Azure CLI: Configurar e Testar OCR + AI (Document Intelligence & OpenAI)

## 📋 Visão Geral

Este guia mostra como usar **Azure CLI** para provisionar, configurar e testar os serviços de **Document Intelligence (OCR)** e **Azure OpenAI** usados na pipeline de ingestão.

---

## 🎯 Pré-requisitos

### 1. Instalar Azure CLI

**Windows (PowerShell como Admin)**:
```powershell
# Download e instalar
winget install -e --id Microsoft.AzureCLI

# Ou via MSI:
# https://aka.ms/installazurecliwindows
```

**macOS**:
```bash
brew update && brew install azure-cli
```

**Linux**:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Login no Azure

```bash
# Login interativo
az login

# Login com service principal (CI/CD)
az login --service-principal \
  --username <APP_ID> \
  --password <SECRET> \
  --tenant <TENANT_ID>

# Listar assinaturas disponíveis
az account list --output table

# Selecionar assinatura
az account set --subscription "Nome ou ID da Assinatura"
```

---

## 🏗️ Provisionar Recursos

### 1. Criar Resource Group

```bash
# Criar resource group
az group create \
  --name concilia-brasil-rg \
  --location brazilsouth

# Verificar
az group show --name concilia-brasil-rg --output table
```

---

### 2. Provisionar Document Intelligence (OCR)

```bash
# Criar recurso Document Intelligence
az cognitiveservices account create \
  --name concilia-doc-intelligence \
  --resource-group concilia-brasil-rg \
  --kind FormRecognizer \
  --sku S0 \
  --location brazilsouth \
  --yes

# Obter endpoint
az cognitiveservices account show \
  --name concilia-doc-intelligence \
  --resource-group concilia-brasil-rg \
  --query "properties.endpoint" \
  --output tsv

# Obter chave
az cognitiveservices account keys list \
  --name concilia-doc-intelligence \
  --resource-group concilia-brasil-rg \
  --query "key1" \
  --output tsv
```

**Salvar variáveis**:
```bash
export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="<endpoint-retornado>"
export AZURE_DOCUMENT_INTELLIGENCE_KEY="<key1-retornada>"
export AZURE_DOCUMENT_INTELLIGENCE_API_VERSION="2024-11-30"
```

---

### 3. Provisionar Azure OpenAI

```bash
# Criar recurso Azure OpenAI
az cognitiveservices account create \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus \
  --custom-domain concilia-openai \
  --yes

# Obter endpoint
az cognitiveservices account show \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --query "properties.endpoint" \
  --output tsv

# Obter chave
az cognitiveservices account keys list \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --query "key1" \
  --output tsv

# Criar deployment de modelo GPT-4
az cognitiveservices account deployment create \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"

# Listar deployments
az cognitiveservices account deployment list \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --output table
```

**Salvar variáveis**:
```bash
export AZURE_OPENAI_ENDPOINT="<endpoint-retornado>"
export AZURE_OPENAI_API_KEY="<key1-retornada>"
export AZURE_OPENAI_DEPLOYMENT="gpt-4"
export AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

---

## 🧪 Testar Serviços via CLI

### 1. Testar Document Intelligence (OCR)

**Criar script de teste**:

**Arquivo**: `scripts/test-ocr.sh`

```bash
#!/bin/bash

# Configurar variáveis
ENDPOINT="${AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}"
KEY="${AZURE_DOCUMENT_INTELLIGENCE_KEY}"
API_VERSION="${AZURE_DOCUMENT_INTELLIGENCE_API_VERSION:-2024-11-30}"

# Arquivo de teste (local)
FILE_PATH="./input/extrato_exemplo.pdf"

if [ ! -f "$FILE_PATH" ]; then
  echo "❌ Arquivo não encontrado: $FILE_PATH"
  exit 1
fi

echo "📄 Enviando documento para análise..."

# Enviar documento
OPERATION_LOCATION=$(curl -X POST \
  "${ENDPOINT}/formrecognizer/documentModels/prebuilt-document:analyze?api-version=${API_VERSION}" \
  -H "Content-Type: application/pdf" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  --data-binary "@${FILE_PATH}" \
  -s -D - \
  | grep -i "operation-location:" \
  | awk '{print $2}' \
  | tr -d '\r')

if [ -z "$OPERATION_LOCATION" ]; then
  echo "❌ Erro ao enviar documento"
  exit 1
fi

echo "✅ Documento enviado. Operation ID: ${OPERATION_LOCATION}"
echo "⏳ Aguardando processamento..."

# Poll resultado
sleep 5

RESULT=$(curl -X GET \
  "${OPERATION_LOCATION}" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -s)

echo "📊 Resultado:"
echo "$RESULT" | jq '.analyzeResult.content' | head -n 20

echo ""
echo "✅ Teste de OCR concluído!"
```

**Executar**:
```bash
chmod +x scripts/test-ocr.sh
./scripts/test-ocr.sh
```

---

### 2. Testar Azure OpenAI (Classificação)

**Criar script de teste**:

**Arquivo**: `scripts/test-openai.sh`

```bash
#!/bin/bash

# Configurar variáveis
ENDPOINT="${AZURE_OPENAI_ENDPOINT}"
KEY="${AZURE_OPENAI_API_KEY}"
DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT}"
API_VERSION="${AZURE_OPENAI_API_VERSION}"

echo "🤖 Testando Azure OpenAI..."

# Texto de teste
TEXT="Banco Bradesco S.A. \
Agência 1234-5 \
Conta Corrente 98765-4 \
Extrato Mensal - Janeiro 2026 \
Saldo Anterior: R$ 1.000,00 \
Créditos: R$ 5.000,00 \
Débitos: R$ 3.000,00 \
Saldo Final: R$ 3.000,00"

# Criar payload JSON
PAYLOAD=$(cat <<EOF
{
  "messages": [
    {
      "role": "system",
      "content": "Você é um classificador de documentos financeiros. Retorne apenas JSON."
    },
    {
      "role": "user",
      "content": "Classifique este documento: ${TEXT}. Retorne JSON com {\"doc_type\": \"BANK_STATEMENT|INVOICE|BOLETO|RECEIPT|OTHER\", \"confidence\": 0-1}"
    }
  ],
  "temperature": 0,
  "max_tokens": 100,
  "response_format": { "type": "json_object" }
}
EOF
)

# Chamar API
RESULT=$(curl -X POST \
  "${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}" \
  -H "Content-Type: application/json" \
  -H "api-key: ${KEY}" \
  -d "$PAYLOAD" \
  -s)

echo "📊 Resposta da IA:"
echo "$RESULT" | jq '.choices[0].message.content' | jq '.'

echo ""
echo "✅ Teste de classificação concluído!"
```

**Executar**:
```bash
chmod +x scripts/test-openai.sh
./scripts/test-openai.sh
```

---

### 3. Testar Pipeline Completo com CLI Integrado

**Criar script integrado**:

**Arquivo**: `scripts/test-pipeline-cli.ts`

```typescript
import { execSync } from "child_process";
import { writeFileSync } from "fs";

// Configurar variáveis do ambiente
const env = {
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
  AZURE_DOCUMENT_INTELLIGENCE_KEY: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
};

console.log("🧪 Testando pipeline com Azure CLI...\n");

// Teste 1: Verificar conectividade Document Intelligence
console.log("1️⃣ Testando Document Intelligence...");
try {
  const diResult = execSync(
    `az cognitiveservices account show --name concilia-doc-intelligence --resource-group concilia-brasil-rg`,
    { encoding: "utf-8" }
  );
  console.log("✅ Document Intelligence: Conectado\n");
} catch (error) {
  console.log("❌ Document Intelligence: Falha\n");
}

// Teste 2: Verificar conectividade Azure OpenAI
console.log("2️⃣ Testando Azure OpenAI...");
try {
  const openaiResult = execSync(
    `az cognitiveservices account show --name concilia-openai --resource-group concilia-brasil-rg`,
    { encoding: "utf-8" }
  );
  console.log("✅ Azure OpenAI: Conectado\n");
} catch (error) {
  console.log("❌ Azure OpenAI: Falha\n");
}

// Teste 3: Executar ingestão via CLI existente
console.log("3️⃣ Executando ingestão de teste...");
try {
  const ingestResult = execSync(
    `npm run ingest -- --input ./input --output ./output --max-files 2 --upload false`,
    { encoding: "utf-8", stdio: "inherit" }
  );
  console.log("✅ Ingestão: Concluída\n");
} catch (error) {
  console.log("❌ Ingestão: Falha\n");
}

console.log("🎉 Teste de pipeline concluído!");
```

**Executar**:
```bash
npx tsx scripts/test-pipeline-cli.ts
```

---

## 🔐 Salvar Credenciais no .env.local

```bash
# Criar arquivo .env.local
cat > .env.local <<EOF
# Document Intelligence (OCR)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=$(az cognitiveservices account show --name concilia-doc-intelligence --resource-group concilia-brasil-rg --query "properties.endpoint" -o tsv)
AZURE_DOCUMENT_INTELLIGENCE_KEY=$(az cognitiveservices account keys list --name concilia-doc-intelligence --resource-group concilia-brasil-rg --query "key1" -o tsv)
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION=2024-11-30

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show --name concilia-openai --resource-group concilia-brasil-rg --query "properties.endpoint" -o tsv)
AZURE_OPENAI_API_KEY=$(az cognitiveservices account keys list --name concilia-openai --resource-group concilia-brasil-rg --query "key1" -o tsv)
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
EOF

echo "✅ Credenciais salvas em .env.local"
```

---

## 📊 Monitoramento via CLI

### Ver logs de uso (Document Intelligence)

```bash
# Últimas 24h
az monitor metrics list \
  --resource "/subscriptions/<SUB_ID>/resourceGroups/concilia-brasil-rg/providers/Microsoft.CognitiveServices/accounts/concilia-doc-intelligence" \
  --metric "TotalCalls" \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval PT1H \
  --output table
```

### Ver logs de uso (Azure OpenAI)

```bash
az monitor metrics list \
  --resource "/subscriptions/<SUB_ID>/resourceGroups/concilia-brasil-rg/providers/Microsoft.CognitiveServices/accounts/concilia-openai" \
  --metric "TotalTokens" \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval PT1H \
  --output table
```

### Ver custos

```bash
# Custos do resource group
az consumption usage list \
  --start-date $(date -u -d '30 days ago' +%Y-%m-%d) \
  --end-date $(date -u +%Y-%m-%d) \
  --query "[?contains(instanceName, 'concilia')]" \
  --output table
```

---

## 🔄 Rotação de Chaves

```bash
# Regenerar chave Document Intelligence
az cognitiveservices account keys regenerate \
  --name concilia-doc-intelligence \
  --resource-group concilia-brasil-rg \
  --key-name key2

# Regenerar chave Azure OpenAI
az cognitiveservices account keys regenerate \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --key-name key2

# Atualizar .env.local com novas chaves
```

---

## 🚀 Automação CI/CD

### Adicionar no GitHub Actions

**Arquivo**: `.github/workflows/azure-setup.yml`

```yaml
name: Azure Setup and Test

on:
  workflow_dispatch:

jobs:
  test-azure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Test Document Intelligence
        run: |
          az cognitiveservices account show \
            --name concilia-doc-intelligence \
            --resource-group concilia-brasil-rg

      - name: Test Azure OpenAI
        run: |
          az cognitiveservices account show \
            --name concilia-openai \
            --resource-group concilia-brasil-rg

      - name: Run Ingestion Test
        env:
          AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: ${{ secrets.AZURE_DOC_INTEL_ENDPOINT }}
          AZURE_DOCUMENT_INTELLIGENCE_KEY: ${{ secrets.AZURE_DOC_INTEL_KEY }}
          AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
          AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_KEY }}
        run: |
          npm ci
          npm run ingest -- --max-files 2 --upload false
```

---

## 📚 Comandos Úteis

```bash
# Listar todos os recursos Cognitive Services
az cognitiveservices account list \
  --resource-group concilia-brasil-rg \
  --output table

# Ver modelo disponíveis Azure OpenAI
az cognitiveservices account list-models \
  --name concilia-openai \
  --resource-group concilia-brasil-rg \
  --output table

# Verificar quota restante
az cognitiveservices account list-usage \
  --name concilia-openai \
  --resource-group concilia-brasil-rg

# Deletar recursos (cuidado!)
az cognitiveservices account delete \
  --name concilia-doc-intelligence \
  --resource-group concilia-brasil-rg
```

---

## 🎯 Checklist de Implementação

- [ ] Azure CLI instalado
- [ ] Login no Azure (`az login`)
- [ ] Resource group criado
- [ ] Document Intelligence provisionado
- [ ] Azure OpenAI provisionado
- [ ] Deployment GPT-4 criado
- [ ] Scripts de teste executados com sucesso
- [ ] Credenciais salvas em .env.local
- [ ] Pipeline local testada
- [ ] Secrets configurados no GitHub Actions

---

## 📞 Suporte

- [Azure CLI Documentation](https://learn.microsoft.com/cli/azure/)
- [Document Intelligence REST API](https://learn.microsoft.com/azure/ai-services/document-intelligence/quickstarts/rest-api)
- [Azure OpenAI REST API](https://learn.microsoft.com/azure/ai-services/openai/reference)

---

**Status**: ✅ Pronto para uso  
**Complexidade**: Média (~1-2 horas)  
**Custo estimado**: ~$50-100/mês (depende do volume)
