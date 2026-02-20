# Azure Deploy Checklist

## ✅ Pré-Deploy

- [ ] Código testado localmente (`npm run build` e `npm run dev`)
- [ ] Todas as dependências instaladas (`npm install`)
- [ ] Variáveis de ambiente configuradas localmente (`.env`)
- [ ] Banco de dados local migrado (`npm run prisma:migrate:dev`)
- [ ] Testes passando (`npm test`)
- [ ] Commits feitos e branch pronto (`git status`)

## ✅ Configuração Azure

### Infrastructure as Code

- [ ] Grupo de Recursos criado (`concilia-brasil-rg`)
- [ ] PostgreSQL Server criado e acessível
- [ ] Database `concilia_brasil` criado
- [ ] App Service Plan criado (SKU: B2 ou superior)
- [ ] Web App criado (`concilia-brasil`)
- [ ] Firewall rules configuradas para PostgreSQL

### Variáveis de Ambiente

Execute o script de setup:
```powershell
.\scripts\setup-azure-env.ps1 -ResourceGroup "concilia-brasil-rg" -AppName "concilia-brasil"
```

Ou configure manualmente via Portal > App Service > Configuration:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Chave aleatória 32+ caracteres
- [ ] `NODE_ENV` - "production"
- [ ] `OPENAI_API_KEY` - Sua chave da OpenAI
- [ ] `STORAGE_PROVIDER` - "local" ou "azure"
- [ ] `AI_PROVIDER` - "openai" ou "azure-openai"
- [ ] `ALLOWED_ORIGINS` - URL da aplicação
- [ ] `LOG_LEVEL` - "info" para production

## ✅ Git & GitHub Actions

- [ ] GitHub repository conectado ao Azure (`andreteraoka/concilia-brasil`)
- [ ] GitHub Actions workflow criado (`.github/workflows/main_concilia-brasil.yml`)
- [ ] Publish profile do Azure salvo em GitHub Secrets (`AZUREAPPSERVICE_PUBLISHPROFILE_*`)

### Verificar Secrets do GitHub

1. Acesse: https://github.com/andreteraoka/concilia-brasil/settings/secrets/actions
2. Verifique se existe `AZUREAPPSERVICE_PUBLISHPROFILE_*`
3. Se não existe, gere nova via Azure Portal

## ✅ Deploy

### Via GitHub Actions (Recomendado)

1. Faça push para branch `main`:
```bash
git add .
git commit -m "Deploy configuration"
git push origin main
```

2. Acesse: https://github.com/andreteraoka/concilia-brasil/actions
3. Aguarde o workflow completar (Build + Deploy)
4. Verifique status: All workflows/last run

### Via Azure CLI (Se GitHub Actions falhar)

```bash
# Fazer zip do projeto
Compress-Archive -Path . -DestinationPath app.zip -Force

# Deploy
az webapp deployment source config-zip `
  --resource-group concilia-brasil-rg `
  --name concilia-brasil `
  --src app.zip
```

## ✅ Pós-Deploy

- [ ] Aplicação acessível em `https://concilia-brasil.azurewebsites.net`
- [ ] Health check OK: `curl https://concilia-brasil.azurewebsites.net/api/health`
- [ ] Migrations rodadas:
  ```bash
  # SSH no App Service
  az webapp remote-connection create \
    --resource-group concilia-brasil-rg \
    --name concilia-brasil
  
  # Dentro da sessão SSH:
  npm run prisma:migrate:deploy
  ```
- [ ] Login funcionando (criar usuário teste)
- [ ] Dashboards carregando
- [ ] Logs sendo registrados (az webapp log stream)
- [ ] Monitoramento habilitado (Application Insights)

## ⚠️ Troubleshooting

### Build falha no GitHub Actions

Verifique:
1. Node version 24.x está no `setup-node@v3`
2. `prisma generate` rodando antes do build
3. Variáveis críticas estão no `.env.example`

### App falha após deploy

Verifique logs:
```bash
az webapp log stream -g concilia-brasil-rg -n concilia-brasil
```

Problemas comuns:
- `DATABASE_URL` incorreta ou não configurada
- `JWT_SECRET` não definido
- Migrations não rodadas
- Versão Node.js incompatível

### POST /api/auth/login retorna erro

Verifique:
- [ ] DATABASE_URL está correto
- [ ] Migrations rodadas com sucesso
- [ ] Usuário teste criado no banco

### Erro 404 em tudo

Verifique:
- [ ] Startup file é "npm start"
- [ ] Build completou sem erros
- [ ] Arquivo `.next/standalone` existe

## 📊 Monitoramento Pós-Deploy

### Application Insights

1. Azure Portal > concilia-brasil > Application Insights
2. Ver:
   - Response time
   - Failed requests
   - Server exceptions
   - Custom metrics

### Application Logs

Em Azure Portal:
- App Service > Log stream (real-time)
- App Service > App Service logs > Download

### Database Monitoring

Em Azure Portal:
- PostgreSQL Server > Monitors
- Query Performance Insights
- Connection monitoring

## 🔐 Checklist de Segurança

- [ ] `JWT_SECRET` tem 32+ caracteres aleatórios
- [ ] Database em modo sslmode=require
- [ ] Firewall PostgreSQL restrito aos IPs necessários
- [ ] Application Insights não expõe dados sensíveis
- [ ] CORS configurado apenas para domínios autorizados
- [ ] Rate limiting habilitado
- [ ] Security headers habilitados
- [ ] Logs não retornam stacktraces em production

## 📞 Suporte

Se encontrar erros:

1. **GitHub Actions não constrói:**
   - Verifique: `.github/workflows/main_concilia-brasil.yml`
   - Rodas: `npm install && prisma generate && npm run build` localmente

2. **App não inicia:**
   - Logs: `az webapp log stream -g concilia-brasil-rg -n concilia-brasil`
   - SSH: `az webapp remote-connection create -g concilia-brasil-rg -n concilia-brasil`

3. **Banco de dados não responde:**
   - Firewall: Permitir IP do App Service
   - Connection: Testar com psql/DBeaver localmente

4. **Erro de autenticação:**
   - `JWT_SECRET` correto?
   - Database com schema correto?
   - Migrations rodadas?

---

**Data**: 2026-02-20
**Versão**: 1.0.0
**Status**: ✅ Ready to Deploy

