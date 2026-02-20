# Configuração de Deploy no Azure

## Pré-requisitos

- Azure CLI instalado
- Conta Azure ativa
- PostgreSQL Database for Azure criado
- GitHub repository conectado

## 1. Preparar o Banco de Dados

### Criar Database PostgreSQL no Azure

```bash
# Conectar ao Azure
az login

# Criar grupo de recurso (se não existir)
az group create --name concilia-brasil-rg --location eastus

# Criar servidor PostgreSQL
az postgres server create \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil-db \
  --location eastus \
  --admin-user dbadmin \
  --admin-password YourSecurePassword123! \
  --sku-name B_Gen5_2

# Criar banco de dados
az postgres db create \
  --resource-group concilia-brasil-rg \
  --server-name concilia-brasil-db \
  --name concilia_brasil
```

### Configurar Firewall

```bash
# Permitir conexão do App Service
az postgres server firewall-rule create \
  --resource-group concilia-brasil-rg \
  --server-name concilia-brasil-db \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## 2. Criar App Service Web App

```bash
# Criar App Service Plan
az appservice plan create \
  --name concilia-brasil-plan \
  --resource-group concilia-brasil-rg \
  --sku B2 \
  --is-linux

# Criar Web App
az webapp create \
  --resource-group concilia-brasil-rg \
  --plan concilia-brasil-plan \
  --name concilia-brasil \
  --runtime "NODE:24-lts"

# Configurar deploy da origem GitHub
az webapp deployment github-actions add \
  --repo-url https://github.com/andreteraoka/concilia-brasil \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil
```

## 3. Configurar Variáveis de Ambiente

### Via Azure Portal (recomendado)

1. Acesse [portal.azure.com](https://portal.azure.com)
2. Procure por "concilia-brasil" (seu App Service)
3. Menu lateral > **Configuration** > **Application settings**
4. Clique em **New application setting** e adicione:

### Via Azure CLI

```bash
# Obter connection string do PG
CONNECTION_STRING=$(az postgres server show-connection-string \
  --server-name concilia-brasil-db \
  --admin-user dbadmin \
  --databases concilia_brasil)

# Definir variáveis (execute uma por uma)
az webapp config appsettings set \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil \
  --settings \
    DATABASE_URL="postgresql://dbadmin:YourSecurePassword123!@concilia-brasil-db.postgres.database.azure.com:5432/concilia_brasil?schema=public&sslmode=require"

az webapp config appsettings set \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil \
  --settings \
    NODE_ENV="production" \
    JWT_SECRET="seu-jwt-secret-seguro-minimo-32-caracteres" \
    OPENAI_API_KEY="sk-..." \
    STORAGE_PROVIDER="local" \
    AI_PROVIDER="openai"

az webapp config appsettings set \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil \
  --settings \
    ALLOWED_ORIGINS="https://concilia-brasil.azurewebsites.net" \
    LOG_LEVEL="info"
```

## Variáveis de Ambiente Obrigatórias

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://...` | Connection string do PostgreSQL |
| `JWT_SECRET` | 32+ caracteres aleatórios | Chave para assinar JWTs |
| `NODE_ENV` | `production` | Environment mode |
| `OPENAI_API_KEY` | `sk-...` | Chave da API OpenAI |
| `STORAGE_PROVIDER` | `local` ou `azure` | Provedor de armazenamento |
| `AI_PROVIDER` | `openai` ou `azure-openai` | Provedor de IA |

## Variáveis de Ambiente Opcionais

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo OpenAI |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins |
| `LOG_LEVEL` | `info` | Nível de log |
| `RATE_LIMIT_ENABLED` | `true` | Habilitar rate limiting |
| `UPLOAD_MAX_SIZE` | `10485760` | Tamanho máximo upload (bytes) |

## 4. Executar Migrations do Prisma

Após o primeiro deploy, conecte via SSH e rode as migrations:

```bash
# SSH no App Service
az webapp remote-connection create \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil

# Dentro da conexão SSH
npm run prisma:migrate:deploy
```

Ou configure como parte do deployment (num script `postdeploy`).

## 5. Verificar Deploy

```bash
# Ver status do deploy
az webapp deployment list-publishing-profiles \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil

# Ver logs
az webapp log stream \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil

# Testar app
curl https://concilia-brasil.azurewebsites.net/api/health
```

## Troubleshooting

### Erro 404 ao acessar a app

Verifique se o `start` script está configurado:
```bash
az webapp config set \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil \
  --startup-file "npm start"
```

### Erro de conexão com Database

1. Confirme a `DATABASE_URL` está correta
2. Verifique firewall rules do PostgreSQL
3. Teste a conexão localmente

### Erro no GitHub Actions

1. Verifique se o publish profile está configurado
2. Regenere o publish profile se necessário
3. Confirme as variáveis de ambiente do GitHub Actions (Settings > Secrets)

## Deploy Manual (se GitHub Actions falhar)

```bash
# Clone o repo
git clone https://github.com/andreteraoka/concilia-brasil.git
cd concilia-brasil

# Login no Azure
az login

# Deploy com ZIP
zip -r app.zip . -x "node_modules/*"
az webapp deployment source config-zip \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil \
  --src app.zip
```

## Monitoramento

### Azure Application Insights

1. No Azure Portal, acesse o App Service
2. Clique em **Application Insights**
3. Configure para monitorar a aplicação

### Logs em Tempo Real

```bash
az webapp log stream \
  --resource-group concilia-brasil-rg \
  --name concilia-brasil \
  --name concilia-brasil
```

## Links Úteis

- [Next.js on Azure](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
- [PostgreSQL Azure](https://azure.microsoft.com/en-us/products/postgresql)
- [Prisma Azure Setup](https://www.prisma.io/docs/orm/overview/platforms/azure)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

