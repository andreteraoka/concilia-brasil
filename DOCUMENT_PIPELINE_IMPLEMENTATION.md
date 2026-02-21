# Document Processing Pipeline - Implementação Completa

## 🎯 Resumo das Mudanças

Este documento detalha a implementação completa do novo sistema de processamento de documentos com:
- ✅ Upload rápido (síncrono) para Azure Blob Storage
- ✅ Processamento assíncrono em fila
- ✅ Monitor visual em tempo real (polling)
- ✅ Suporte a múltiplos arquivos simultâneos
- ✅ Rastreamento completo de erros e progresso

---

## 📋 Arquivos Criados/Modificados

### 1. Schema Prisma (Database)

**Arquivo:** `prisma/schema.prisma`
- Adicionado modelo `ProcessingJob` com:
  - Status: queued, processing, completed, failed
  - Stages: ocr, classification, validation, complete
  - Rastreamento de progresso (0-100%)
  - Aumento relação com Document e Company
  - Índices para queries otimizadas

**Migração:** `prisma/migrations/20260221_add_processing_job/migration.sql`
- CreateTable ProcessingJob com índices
- ForeignKeys com onDelete:CASCADE

---

### 2. Backend - Fila de Processamento

#### `src/lib/queue/DocumentProcessor.ts`
- Processa documentos através dos stages:
  1. **OCR (Document Intelligence)** - Extrai texto
  2. **Classificação (OpenAI)** - Classifica transações
  3. **Validação** - Valida dados e estrutura
  4. **Completo** - Finaliza processamento

Métodos:
- `processDocument()` - Fluxo completo com tratamento de erros
- `performOCR()` - Integração com Document Intelligence
- `classifyDocument()` - Integração com OpenAI
- `validateAndStructure()` - Validação final

#### `src/lib/queue/JobQueue.ts`
- Gerenciador central da fila
- `start()` - Inicia polling de jobs
- `poll()` - Faz polling periódico (5s padrão)
- `enqueueDocument()` - Adiciona novo job à fila
- `getJobStatus()` - Retorna status de um job
- `getDocumentProgress()` - Retorna progresso de todos os jobs de um documento

Configurações:
- `maxConcurrent`: 5 jobs simultâneos (configurável)
- `pollInterval`: 5000ms entre polls
- `maxRetries`: 3 tentativas (não implementado ainda)

#### `src/lib/queue/documentJobQueue.ts`
- Singleton para JobQueue global
- `getJobQueue()` - Obtém/cria instância global
- `startJobQueue()` - Inicializa queue
- `stopJobQueue()` - Para queue gracefully

---

### 3. API Endpoints

#### `app/api/protected/documents/upload/route.ts`
**POST** - Upload de documentos
- Entrada: FormData com múltiplos files
- Processo:
  1. Upload arquivo para Blob (rápido, síncrono)
  2. Criar Document no banco
  3. Criar ProcessingJob na fila
  4. Retorna IDs imediatamente
- Resposta: 201 Created
  ```json
  {
    "success": true,
    "count": 2,
    "documents": [
      {
        "documentId": "doc-uuid",
        "jobId": "job-uuid",
        "fileName": "invoice.pdf",
        "blobPath": "/path/to/blob"
      }
    ]
  }
  ```

#### `app/api/protected/documents/[documentId]/status/route.ts`
**GET** - Status de um documento
- Caminho: `/api/protected/documents/{documentId}/status`
- Resposta: 200 OK
  ```json
  {
    "documentId": "doc-uuid",
    "fileName": "invoice.pdf",
    "overallStatus": "processing",
    "averageProgress": 45,
    "jobsCount": 1,
    "jobs": [
      {
        "jobId": "job-uuid",
        "status": "processing",
        "stage": "classification",
        "progress": 45,
        "createdAt": "2024-01-15T10:30:00Z",
        "startedAt": "2024-01-15T10:35:00Z",
        "error": null
      }
    ]
  }
  ```

#### `app/api/protected/documents/jobs/[jobId]/route.ts`
**GET** - Detalhes de um job específico
- Caminho: `/api/protected/documents/jobs/{jobId}`
- Resposta: 200 OK com todos os dados do job:
  - Metadados (file name, size)
  - Status e stage
  - Resultados (ocrText, extractedData, classifications)
  - Erros (errorMessage, errorType)
  - Timeline (createdAt, startedAt, completedAt)

---

### 4. Frontend - Hooks

#### `src/hooks/useDocumentProgress.ts`
- `useDocumentProgress(documentId)` - Hook para polling de progresso
  - Retorna: `{ progress, loading, error }`
  - Polling: 2 segundos
  - Auto-refresh via useEffect
  - Atualiza automaticamente

- `useJobStatus(jobId)` - Hook para status de job específico
  - Retorna: `{ job, loading, error }`
  - Polling: 2 segundos

---

### 5. Frontend - Componentes React

#### `src/components/DocumentProgressMonitor.tsx`
- Componente visual para mostrar progresso
- Features:
  - Exibe barra de progresso geral (0-100%)
  - Mostra stages em ordem: OCR → Classificação → Validação → Concluído
  - Indicadores visuais:
    - ⏳ Aquardando
    - ⏳ Em processamento (com pulse animation)
    - ✅ Concluído (verde)
    - ❌ Erro (vermelho)
  - Timeline de execução
  - Callbacks: onCompleted, onError

#### `src/components/DocumentUploadPanel.tsx`
- Painel completo de upload para usuário
- Features:
  - Drag-and-drop de arquivos
  - Click para selecionar
  - Múltiplos arquivos simultâneos
  - Feedback visual durante upload
  - Lista de documentos em processamento
  - Integra DocumentProgressMonitor para cada arquivo

---

### 6. UI Pages

#### `app/(protected)/documents/page.tsx`
- Página de documentos com:
  - Seção informativa sobre o processo
  - DocumentUploadPanel integrado
  - Explicação dos stages de processamento
  - Layout com dark mode support

---

### 7. Scripts & CLI

#### `scripts/document-queue-worker.ts`
- Worker standalone para rodar a job queue
- Uso: `npm run queue:worker`
- Features:
  - Graceful shutdown (SIGTERM, SIGINT)
  - Logging de status
  - Gerenciamento de conexão DB

---

### 8. Configuração

#### `package.json`
- Script adicionado: `"queue:worker": "tsx scripts/document-queue-worker.ts"`
- Dependências necessárias:
  - @azure/ai-document-intelligence
  - @azure/core-auth
  - @azure/storage-blob
  - openai
  - @prisma/client
  - bcryptjs

---

## 🔧 Environment Variables Necessárias

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db"

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://{region}.cognitiveservices.azure.com/"
AZURE_DOCUMENT_INTELLIGENCE_KEY="your-key"

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Job Queue Config
PROCESSING_MAX_CONCURRENT=5
PROCESSING_POLL_INTERVAL=5000
```

---

## 📊 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UPLOAD (Rápido, Síncrono)                                │
├─────────────────────────────────────────────────────────────┤
│ User seleciona múltiplos arquivos                           │
│ Browser faz POST /api/protected/documents/upload            │
│                                                              │
│ Backend:                                                     │
│   • Upload arquivo → Azure Blob (rápido)                    │
│   • Criar Document no banco                                 │
│   • Criar ProcessingJob (status: queued)                   │
│   • Retorna doc IDs + job IDs (201)                         │
│                                                              │
│ User recebe resposta instantaneamente com tracking IDs      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. MONITOR (Tempo Real, Polling)                            │
├─────────────────────────────────────────────────────────────┤
│ Frontend faz polling cada 2 segundos                        │
│ GET /api/protected/documents/{docId}/status                │
│                                                              │
│ Retorna progresso geral + status de cada job                │
│ DocumentProgressMonitor atualiza UI                         │
│   • Barra de progresso                                      │
│   • Estágio atual (OCR → Classificação → ...)              │
│   • Erros se houver                                         │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PROCESSAMENTO (Assíncrono em Fila)                       │
├─────────────────────────────────────────────────────────────┤
│ JobQueue faz polling cada 5 segundos                        │
│ Busca ProcessingJobs com status: queued                     │
│                                                              │
│ Para cada job (até max 5 concurrent):                       │
│   1. OCR: Document Intelligence extrai texto                │
│      - Atualiza: currentStage = ocr, progress = 25          │
│                                                              │
│   2. Classificação: OpenAI classifica                        │
│      - Atualiza: currentStage = classification, progress = 60│
│                                                              │
│   3. Validação: Valida dados                                │
│      - Atualiza: currentStage = validation, progress = 90   │
│                                                              │
│   4. Completo: Marca como finished                          │
│      - Atualiza: status = completed, progress = 100         │
│                                                              │
│ Se erro: status = failed, errorMessage, errorType           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Usar

### 1. Inicializar Banco

```bash
npx prisma migrate deploy
npx prisma generate
```

### 2. Iniciar a Aplicação

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start

# Rodar job queue worker (separado, optional)
npm run queue:worker
```

### 3. Usar a Interface

1. Ir para `/documents`
2. Arrastar ou selecionar PDFs/imagens
3. Clicar "Upload"
4. Ver progresso em tempo real com monitor visual
5. Pode enviar mais arquivos enquanto os anteriores processam

---

## 🔄 Arquitetura

### Sem Fila Tradicional
- Não usa Redis/Bull/RabbitMQ
- Usa Prisma + Polling (simples de manter em Azure)
- Escalável até ~5 jobs simultâneos por instância

### Alternativas Futuras
Se precisar escalar para mil+ docs:
1. **Bull/BullMQ**: Fila mais robusta em memória
2. **Azure Service Bus**: Fila gerenciada do Azure
3. **Azure Functions**: Workers separados

---

## ✅ Checklist de Implementação

- [x] Schema Prisma com ProcessingJob
- [x] Migração do banco
- [x] DocumentProcessor (OCR + Classificação)
- [x] JobQueue (polling + management)
- [x] Singleton jobQueue global
- [x] API upload (sincro)
- [x] API status (detalhes)
- [x] API job details
- [x] Hook useDocumentProgress
- [x] Componente DocumentProgressMonitor
- [x] Componente DocumentUploadPanel
- [x] Página /documents melhorada
- [x] Script worker standalone
- [x] Package.json scripts
- [ ] Testes unitários da fila
- [ ] Testes de integração
- [ ] Monitoramento/alertas

---

## 📝 Notas

- Processador está com mocks de OCR/OpenAI (simulações com delay)
- Em produção, remover `await this.delay()` e conectar com APIs reais
- Status: queued → processing → completed/failed
- Stages: ocr → classification → validation → complete
- Middleware já valida autorização (companyId)

---

## 🐛 Próximos Steps

1. **Executar Prisma migrations** no servidor Azure
2. **Testar upload** com arquivo real
3. **Conectar Document Intelligence** (trocar mock por chamada real)
4. **Conectar OpenAI** (trocar mock por chamada real)
5. **Adicionar logging estruturado** em JSON
6. **Implementar retry logic** para jobs falhados
7. **Adicionar alertas** para erros
8. **Dashboard de monitoramento** para admin

