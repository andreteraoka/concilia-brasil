# Concilia Brasil - Guia de implantação no Azure

Este guia segue exatamente a ordem de provisionamento recomendada para colocar o projeto em produção.

## 1) Resource Group

No Azure Portal:
- Create Resource > Resource Group
- Nome: rg-concilia-prod
- Região: Brazil South

## 2) Azure Database for PostgreSQL

No Azure Portal:
- Create Resource > Azure Database for PostgreSQL
- Tipo: Flexible Server
- Compute inicial: B1ms
- Região: Brazil South

Guarde:
- Host
- Username
- Password
- Database name

Connection string padrão Prisma:

postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/DB_NAME?schema=public&sslmode=require

No projeto, configure a variável DATABASE_URL com esse valor.

Depois de configurar:
- npm run prisma:generate
- npm run prisma:migrate:deploy

## 3) Azure Blob Storage

No Azure Portal:
- Create Resource > Storage Account
- Região: Brazil South

Após criar:
- Crie o container: documents

No App Service, configure:
- STORAGE_PROVIDER=azure-blob
- AZURE_STORAGE_CONNECTION_STRING
- AZURE_STORAGE_CONTAINER=documents
- AZURE_STORAGE_ACCOUNT_NAME

Observação:
- Hoje o projeto já suporta troca de provider por variável de ambiente.
- Para usar Blob de fato, finalize a implementação de AzureBlobStorageProvider.

## 4) Azure App Service

No Azure Portal:
- Create Resource > App Service
- Runtime stack: Node 20
- Região: Brazil South
- Publicação: Code

Deploy:
- Conectar ao GitHub
- Selecionar repositório e branch principal

Variáveis de ambiente mínimas no App Service:
- NODE_ENV=production
- APP_NAME=concilia-brasil
- JWT_SECRET
- DATABASE_URL
- STORAGE_PROVIDER
- AZURE_STORAGE_CONNECTION_STRING
- AZURE_STORAGE_CONTAINER
- AZURE_STORAGE_ACCOUNT_NAME
- AI_PROVIDER
- OPENAI_API_KEY (ou AZURE_OPENAI_* quando migrar)

Health checks recomendados:
- Habilitar Always On
- Configurar logs do App Service

## 5) Azure OpenAI (depois do sistema estável)

Modelos sugeridos:
- gpt-4o-mini para custo menor
- gpt-4o para extração mais complexa

Quando migrar para Azure OpenAI:
- AI_PROVIDER=azure-openai
- AZURE_OPENAI_ENDPOINT
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_API_VERSION
- AZURE_OPENAI_DEPLOYMENT

## 6) Azure AI Document Intelligence

Criar recurso no Azure Portal e configurar:
- AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
- AZURE_DOCUMENT_INTELLIGENCE_API_KEY

Uso indicado:
- PDF bancário
- Notas fiscais
- Layouts variados

## Checklist final de go-live

- Banco PostgreSQL criado e acessível do App Service
- Migrações aplicadas com prisma migrate deploy
- Storage Account criada com container documents
- Variáveis de ambiente configuradas no App Service
- Deploy do GitHub concluído e aplicação online
- Logs ativos para diagnóstico
