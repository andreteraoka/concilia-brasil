# 📋 Prompt Conciso para Atualizar README

Use este prompt com um LLM (ChatGPT, Claude, etc.) para atualizar automaticamente o README.md com os detalhes completos da pipeline de IA:

---

## 🤖 Prompt:

```
Atualizar a seção "🧠 Pipeline de Ingestão de Documentos (MVP)" do README.md com a seguinte estrutura detalhada:

## 🧠 Pipeline de Ingestão de Documentos com IA

### Arquitetura Multi-Stage

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Upload    │──▶│   OCR       │──▶│ Validação   │──▶│Classificação│
│  Documento  │   │  Azure DI   │   │  Semântica  │   │   + Rota    │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐   ┌─────────────┐                    ┌─────────────┐
│  Resultado  │◀──│ Persistência│◀───────────────────│  Extração   │
│    JSON     │   │ Transações  │                    │ Estruturada │
└─────────────┘   └─────────────┘                    └─────────────┘
```

### 📦 Stages da Pipeline (Ordem de Execução)

#### Stage 1: Extração (OCR)
- **Serviço**: Azure Document Intelligence API (2024-11-30)
- **Fallback**: Extração local para TXT/CSV
- **Saída**: Texto bruto + metadados estruturados
- **Arquivo**: `src/modules/documents/pipeline/extractor.ts`

#### Stage 2: Validação Semântica (Prompt 01)
- **Template**: `prompts/01_validacao_semantica_pos_ocr.json`
- **Objetivo**: Detectar inconsistências numéricas e normalizar transações
- **IA**: Azure OpenAI (temp=0.1, top_p=0.1)
- **Validações**:
  - ✓ Soma créditos/débitos vs. saldos
  - ✓ Datas dentro do período
  - ✓ Campos obrigatórios presentes
  - ✓ Valores numéricos válidos
- **Saída**: `semanticValidation` com confidence por transação
- **Fallback**: Retorna structure vazia + flag `needs_human_review: true`

#### Stage 3: Classificação + Rota (Prompt 02)
- **Template**: `prompts/02_classificacao_documento.json`
- **Objetivo**: Identificar tipo de documento e bloquear lixo
- **IA**: Azure OpenAI (temp=0, top_p=0.1)
- **Tipos suportados**:
  - BANK_STATEMENT (extrato bancário)
  - INVOICE (nota fiscal)
  - BOLETO (boleto bancário)
  - RECEIPT (recibo)
  - CONTRACT (contrato)
  - OTHER (outros)
  - REJECT (lixo/irrelevante → rota "skip")
- **Security Flags**: PII_DETECTED, SUSPECTED_CREDENTIALS
- **Saída**: `routeClassification` com rota de processamento
- **Fallback**: Heurística baseada em keywords (OUTRO com confidence 0.3)

#### Stage 4: Extração Estruturada (Prompt 03)
- **Template**: `prompts/03_extracao_estruturada_schema.json`
- **Objetivo**: Converter para payload pronto para persistência PostgreSQL
- **IA**: Azure OpenAI (temp=0.2, top_p=0.1)
- **Schema de saída**:
  ```typescript
  {
    companyId: string,
    accounts: Array<{externalRef, bankName, last4, currency}>,
    transactions: Array<{accountRef, date, description, amount, type, category}>,
    document: {source, period, closing_balance, accuracyScore}
  }
  ```
- **Saída**: `persistencePayload` pronto para Prisma ORM
- **Fallback**: Estrutura mínima com companyId + metadata

#### Stage 5: Upload para Blob Storage (Opcional)
- **Serviço**: Azure Blob Storage
- **Containers**:
  - `processed-docs-json`: Resultados processados
  - `original-docs`: Arquivos originais (se `--upload-original`)
- **Nomenclatura**: `{companyId}/{sha256}_{timestamp}.json`
- **Saída**: URLs públicas em `azure.blobJsonUrl` e `azure.blobOriginalUrl`

### 🎯 Prompts de IA (Detalhe Técnico)

| # | Nome | Objetivo | Temperatura | Max Tokens | Fallback |
|---|------|----------|-------------|------------|----------|
| **01** | Validação Semântica | Verificar consistência financeira | 0.1 | 1800 | Structure vazia |
| **02** | Classificação + Rota | Detectar tipo + lixo | 0.0 | 400 | Keyword heurística |
| **03** | Extração Estruturada | Payload multi-tenant | 0.2 | 1200 | Metadata básico |
| **04** | Insights Executivos | Resumo narrativo KPIs | 0.4 | 700 | Mensagem padrão |

Todos os prompts estão em `src/modules/documents/pipeline/prompts/` com versões `.json` (config) e `.md` (docs).

### 🔧 CLI de Ingestão

```bash
# Processar documentos em lote
npm run ingest -- --input ./input --output ./output

# Opções disponíveis
--input <dir>              # Diretório de entrada (default: ./input)
--output <dir>             # Diretório de saída (default: ./output)
--max-files <n>            # Limitar quantidade de arquivos
--concurrency <n>          # Workers paralelos (default: 3)
--upload <true|false>      # Upload para Azure Blob (default: false)
--upload-original          # Incluir arquivo original no upload
--quiet                    # Modo silencioso (menos logs)
```

**Formato de saída**: `{sha256}_{nomeOriginal}.json`

### 🔐 Variáveis de Ambiente

```bash
# Azure Document Intelligence (OCR)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION=2024-11-30

# Azure OpenAI (Classificação + Validação)
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Azure Blob Storage (Upload opcional)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpoints...
AZURE_STORAGE_CONTAINER=processed-docs-json
```

**Fallback Automático**: Pipeline funciona localmente sem Azure configurado (modo degradado).

### 🧪 Testes e Exemplos

```bash
# Executar testes da pipeline
npm run test

# Exemplo de insights executivos (Prompt 04)
npx tsx scripts/example-insights.ts

# CI/CD: Workflow de ingestão
.github/workflows/ingestion-pipeline.yml
```

### 📊 Resultado JSON (Exemplo)

```json
{
  "id": "abc123...",
  "source": { "path": "...", "sha256": "...", "mimeType": "application/pdf" },
  "extraction": { "method": "document_intelligence", "text": "...", "pages": [...] },
  "semanticValidation": {
    "is_valid": true,
    "confidence_overall": 0.87,
    "normalized": { "transactions": [...], "currency": "BRL" },
    "needs_human_review": false
  },
  "routeClassification": {
    "doc_type": "BANK_STATEMENT",
    "route": "extract_bank_statement",
    "security_flags": ["NONE"]
  },
  "persistencePayload": {
    "companyId": "...",
    "accounts": [...],
    "transactions": [...],
    "document": {...}
  },
  "azure": { "blobJsonUrl": "https://...", "blobOriginalUrl": null },
  "errors": [],
  "timestamps": { "processedAt": "2026-02-20T21:30:00Z" }
}
```

### 🔄 Workflow GitHub Actions

Arquivo: `.github/workflows/ingestion-pipeline.yml`

**Triggers**:
- Manual via `workflow_dispatch`
- Push em `input/**`, `scripts/ingest.ts`, ou `src/modules/documents/pipeline/**`

**Steps**:
1. Checkout + Setup Node 22
2. Install dependencies (npm ci)
3. Lint (continue-on-error)
4. Test (continue-on-error)
5. Run ingestion (max 5 files)
6. Upload output artifact

**Status**: ✅ Operacional em produção

---

Manter o restante do README.md intacto. Substituir apenas a seção "🧠 Pipeline de Ingestão de Documentos (MVP)" pela estrutura acima.
```

---

## 📝 Como Usar

1. Copie o prompt acima
2. Cole em ChatGPT/Claude/LLM de sua preferência
3. Anexe o conteúdo atual do README.md
4. Peça: "Execute este prompt e retorne o README atualizado"
5. Revise e faça ajustes finos se necessário

---

## ✅ Checklist de Validação

Após atualizar o README, verificar se contém:

- [ ] Diagrama visual da arquitetura multi-stage
- [ ] Descrição detalhada de cada stage (1-5)
- [ ] Tabela comparativa dos 4 prompts de IA
- [ ] Comandos CLI com todas as opções
- [ ] Variáveis de ambiente necessárias
- [ ] Comportamento de fallback explicado
- [ ] Exemplo de JSON de saída
- [ ] Link para workflows GitHub Actions
- [ ] Referências aos arquivos de código fonte
