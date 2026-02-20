# Azure Setup Checklist for Ingestion Pipeline

Este checklist prepara os recursos para ativar OCR, classificação com IA e upload em blob no pipeline de ingestão.

## 1) Azure AI Document Intelligence

- Criar recurso "Document Intelligence"
- Copiar:
  - `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
  - `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- Opcional:
  - `AZURE_DOCUMENT_INTELLIGENCE_API_VERSION` (padrão no projeto: `2024-11-30`)

## 2) Azure OpenAI

- Criar recurso "Azure OpenAI"
- Criar deployment de modelo para análise textual
- Copiar:
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_OPENAI_DEPLOYMENT`
  - `AZURE_OPENAI_API_VERSION`

## 3) Azure Blob Storage (opcional)

- Criar Storage Account + container para resultados
- Copiar:
  - `AZURE_STORAGE_CONNECTION_STRING`
  - `AZURE_STORAGE_CONTAINER`

## 4) Onde configurar

### Local

- Arquivo `.env.local` (não versionar)

### GitHub Actions

- Repositório > Settings > Secrets and variables > Actions
- Criar secrets com os mesmos nomes das variáveis acima

## 5) Comportamento sem Azure configurado

- Pipeline continua rodando para `txt/csv`
- Para `pdf/imagem`, registra warning de configuração ausente
- Upload em blob é ignorado quando `--upload false` ou sem env vars
