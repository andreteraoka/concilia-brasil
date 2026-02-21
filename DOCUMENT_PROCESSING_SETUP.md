# Document Processing Pipeline - Setup & Próximas Etapas

## 🚀 Setup Inicial (Server Azure)

### 1. Executar Prisma Migrations

```bash
# Via SSH no App Service
az webapp ssh --resource-group c1 --name concilia-brasil

# Dentro do servidor:
cd /home/site/wwwroot
npx prisma migrate deploy
npx prisma generate
```

### 2. Environment Variables (Azure Portal)

Adicione em **Configuration → Application settings**:

```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://{region}.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key-here
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
OPENAI_API_KEY=sk-...
PROCESSING_MAX_CONCURRENT=5
PROCESSING_POLL_INTERVAL=5000
```

### 3. Inicializar Job Queue

Na raiz da aplicação, fazer uma chamada (uma única vez):

```bash
curl https://concilia-brasil.azurewebsites.net/api/init
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Job queue started"
}
```

---

## ✅ Checklist de Validação

- [ ] Prisma migrations executadas com sucesso
- [ ] Database schema contém tabela `ProcessingJob`
- [ ] Environment variables configuradas no Azure
- [ ] Job queue iniciado (`/api/init` retorna 200)
- [ ] Usuário pode fazer login
- [ ] `GET /documents` carrega página nova
- [ ] Componente de upload aparece com drag-and-drop
- [ ] Upload de arquivo pequeno (< 10MB) sucede
- [ ] Monitor de progresso aparece e começa a fazer polling
- [ ] Após 10s, monitor mostra "OCR" em processamento
- [ ] Job completa e mostra "✅ Concluído"

---

## 🧪 Teste Manual

### 1. Upload um Arquivo

```bash
curl -X POST https://concilia-brasil.azurewebsites.net/api/protected/documents/upload \
  -H "Authorization: Bearer {token}" \
  -F "files=@sample.pdf"
```

Esperado:
```json
{
  "success": true,
  "count": 1,
  "documents": [
    {
      "documentId": "abc-123",
      "jobId": "job-456",
      "fileName": "sample.pdf",
      "blobPath": "/uploads/company/doc.pdf"
    }
  ]
}
```

### 2. Monitorar Progresso

```bash
curl -H "Authorization: Bearer {token}" \
  https://concilia-brasil.azurewebsites.net/api/protected/documents/abc-123/status
```

Esperado:
```json
{
  "documentId": "abc-123",
  "fileName": "sample.pdf",
  "overallStatus": "processing",
  "averageProgress": 35,
  "jobs": [
    {
      "jobId": "job-456",
      "status": "processing",
      "stage": "classification",
      "progress": 35
    }
  ]
}
```

---

## 🔧 Customizações Importantes

### Trocar Mocks por Implementações Reais

#### DocumentProcessor.ts - performOCR()

Substituir:
```typescript
// Simular chamada ao Document Intelligence
await this.delay(3000);
const ocrText = `[OCR Text extracted...]`;
```

Por:
```typescript
const { analyzeDocumentFromUrl } = await this.docIntelligence.beginAnalyzeDocumentFromUrl(
  'prebuilt-document',
  blobPath
);

const result = await analyzeDocumentFromUrl;
const ocrText = result.content;
```

#### DocumentProcessor.ts - classifyDocument()

Substituir:
```typescript
// Simular chamada ao OpenAI
await this.delay(2000);
const classifications = {
  category: 'invoice',
  transactionType: 'expense',
  confidence: 0.95
};
```

Por:
```typescript
const response = await this.openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{
    role: 'user',
    content: `Analyze this document text:\n${ocrText}\n\nRespond as JSON: { category, transactionType, confidence, suggestedDescription, suggestedAmount }`
  }],
  temperature: 0.2,
  response_format: { type: 'json_object' }
});

const classifications = JSON.parse(response.choices[0].message.content || '{}');
```

---

## 📊 Monitoramento em Produção

### Logs da Job Queue

Ao usar `npm run queue:worker`:

```bash
🚀 Starting Document Processing Job Queue Worker...
✅ Database connected
✅ Job Queue started successfully
⏳ Listening for documents... Press Ctrl+C to exit
[JOB-123] Starting OCR processing...
[JOB-123] Starting classification...
[JOB-123] Validating...
[COMPLETED] Job JOB-123 processed successfully
```

### Alertas Recomendados

Configurar alertas no Azure para:

1. **Jobs Falhados**
   ```sql
   SELECT COUNT(*) FROM public."ProcessingJob"
   WHERE status = 'failed' AND "createdAt" > NOW() - INTERVAL '1 hour'
   ```

2. **Jobs Timeout**
   ```sql
   SELECT COUNT(*) FROM public."ProcessingJob"
   WHERE status = 'processing' 
   AND "startedAt" < NOW() - INTERVAL '15 minutes'
   ```

3. **Fila Crescendo**
   ```sql
   SELECT COUNT(*) FROM public."ProcessingJob"
   WHERE status = 'queued'
   ```

---

## 🐛 Troubleshooting

### Problem: Queue não está processando

**Solução:**
1. Verificar se `/api/init` foi chamado
2. Conferir logs: `npm run queue:worker` em terminal
3. Verificar se ProcessingJob table existe: `SELECT COUNT(*) FROM "ProcessingJob";`

### Problem: Upload falha com 500

**Solução:**
1. Verificar se blob storage credentials estão corretos
2. Verificar se Document table existe
3. Ver logs: `docker logs app-container` (ou App Service logs)

### Problem: Monitor não atualiza

**Solução:**
1. Abrir DevTools → Network → procurar requests a `/api/protected/documents/.../status`
2. Ver se status HTTP é 200
3. Conferir se documentId está correto
4. Aumentar PROCESSING_POLL_INTERVAL se muitos requests

### Problem: Job fica em "processing" eternamente

**Solução:**
1. Verificar se `npm run queue:worker` está rodando
2. Se usando App Service, configurar Always On
3. Aumentar Application Resources (CPU/Memory)

---

## 🚀 Escalabilidade Futura

### Phase 2: Usar Redis/Bull

Se o sistema crescer além de 100 docs/minuto:

```typescript
import Bull from 'bull';

const documentQueue = new Bull('documents', {
  redis: { host: 'redis.host', port: 6379 }
});

// Mais rápido, mais confiável, retry automático
```

### Phase 3: Usar Azure Service Bus

Para cenários enterprise:

```typescript
const { ServiceBusClient } = require("@azure/service-bus");

const sbClient = new ServiceBusClient(connectionString);
const sender = sbClient.createSender("documents-queue");
```

### Phase 4: Azure Durable Functions

Para workflows complexos com múltiplas etapas distribuídas.

---

## 📝 Documentação de Referência

- [Prisma Docs](https://www.prisma.io/docs)
- [Azure Document Intelligence](https://learn.microsoft.com/azure/ai-services/document-intelligence/)
- [OpenAI API](https://platform.openai.com/docs)
- [Azure Blob Storage](https://learn.microsoft.com/azure/storage/blobs/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## 🎓 Arquitetura Final

```
┌──────────────────────────────────────────────────────────┐
│                    Usuário (Browser)                     │
│                 GET /documents (React)                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│              DocumentUploadPanel                          │
│         (Drag-drop, Multiple Files)                      │
└─────────────────────────────────────────────────────────┘
                            ↓
              POST /api/.../upload (rápido)
                            ↓
┌──────────────────────────────────────────────────────────┐
│                  Backend API                             │
│  1. Upload arquivo → Azure Blob Storage                 │
│  2. Criar Document row                                  │
│  3. Criar ProcessingJob row (status=queued)            │
│  4. Return 201 com IDs                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
           ┌───────────────┴───────────────┐
           ↓                               ↓
  ┌──────────────────┐          ┌──────────────────┐
  │ Frontend Polling │          │ JobQueue Worker  │
  │ (2s interval)    │          │ (5s polling)     │
  │                  │          │                  │
  │ GET /status      │          │ Processa jobs    │
  │ DocumentProgress │          │ OCR+AI+Validate  │
  │ Monitor          │          │ Update DB progr. │
  └──────────────────┘          └──────────────────┘
           ↓                               ↓
     ┌─────────────────────────────────────┐
     │    PostgreSQL                      │
     │  ProcessingJob table               │
     │  (status, stage, progress)        │
     └─────────────────────────────────────┘
```

---

## ✨ Conclusão

A nova arquitetura permite:
- ✅ Upload rápido (< 1s para arquivos pequenos)
- ✅ Processamento assíncrono (não bloqueia usuário)
- ✅ Monitor visual em tempo real
- ✅ Múltiplos uploads simultâneos
- ✅ Rastreamento completo de erros
- ✅ Escalável até 1000s de documentos/dia

Próximo passo: **Executar migrations e testar com arquivo real!**

