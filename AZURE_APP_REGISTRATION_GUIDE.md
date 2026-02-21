# 🔐 Portal do Azure: Configuração do App Registration (Passo a Passo)

## ✅ Pré-requisitos
- ✅ Conta Azure ativa
- ✅ Usuário `ateraoka@yahoo.com` criado no Azure AD
- ✅ Acesso ao [Portal do Azure](https://portal.azure.com)

---

## 📋 Passo 1: Criar App Registration

### 1.1 Acessar Azure Active Directory
1. Entre no [Portal do Azure](https://portal.azure.com)
2. No menu lateral esquerdo, clique em **"Microsoft Entra ID"** (ou **"Azure Active Directory"**)
3. No menu lateral do Entra ID, clique em **"App registrations"**
4. Clique em **"+ New registration"** (no topo)

### 1.2 Configurar o Aplicativo
Preencha os campos:

**Name:**
```
Concilia Brasil Auth
```

**Supported account types:**
- ☑️ **"Accounts in this organizational directory only (Single tenant)"**
  - _Isso garante que apenas usuários do seu Azure AD podem fazer login_

**Redirect URI:**
- Platform: **Web**
- URL (desenvolvimento local):
```
http://localhost:3000/api/auth/callback/azure-ad
```

**NÃO CLIQUE EM REGISTRAR AINDA!**

### 1.3 Adicionar Redirect URI de Produção
Antes de clicar em "Register", clique em **"Add a Redirect URI"** e adicione:

```
https://concilia-brasil.azurewebsites.net/api/auth/callback/azure-ad
```

Agora clique em **"Register"**.

✅ **App criado com sucesso!**

---

## 📋 Passo 2: Copiar Valores Importantes

Após criar o app, você verá a página **"Overview"**. Copie os seguintes valores:

### 2.1 Application (client) ID
Exemplo: `12345678-1234-1234-1234-123456789abc`

**Copie este valor** → Vai no `.env.local` como `AZURE_AD_CLIENT_ID`

### 2.2 Directory (tenant) ID
Exemplo: `87654321-1234-1234-1234-123456789xyz`

**Copie este valor** → Vai no `.env.local` como `AZURE_AD_TENANT_ID`

---

## 📋 Passo 3: Criar Client Secret

### 3.1 Acessar Certificates & secrets
No menu lateral do app, clique em **"Certificates & secrets"**

### 3.2 Criar um novo secret
1. Clique na aba **"Client secrets"**
2. Clique em **"+ New client secret"**

**Description:**
```
Concilia Brasil Production Secret
```

**Expires:**
- Escolha **"24 months"** (2 anos)
  - _⚠️ IMPORTANTE: Anote no calendário para renovar antes de expirar!_

3. Clique em **"Add"**

### 3.3 Copiar o Secret
**⚠️ ATENÇÃO CRÍTICA:**
- O **Value** só aparece UMA VEZ
- Se você sair da página sem copiar, terá que criar um novo secret
- **NÃO copie o "Secret ID"** - copie o **"Value"**

**Copie o VALUE** → Vai no `.env.local` como `AZURE_AD_CLIENT_SECRET`

Exemplo de Value:
```
a1B2c3D4~eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5
```

---

## 📋 Passo 4: Configurar API Permissions

### 4.1 Acessar API permissions
No menu lateral do app, clique em **"API permissions"**

### 4.2 Verificar permissões padrão
Você já deve ter:
- ☑️ `User.Read` (Microsoft Graph)

### 4.3 Adicionar permissões adicionais (se necessário)
Se `User.Read` não estiver lá:
1. Clique em **"+ Add a permission"**
2. Clique em **"Microsoft Graph"**
3. Clique em **"Delegated permissions"**
4. Marque:
   - ☑️ `openid`
   - ☑️ `profile`
   - ☑️ `email`
   - ☑️ `User.Read`
5. Clique em **"Add permissions"**

### 4.4 Conceder consentimento do admin (IMPORTANTE)
1. Clique em **"✓ Grant admin consent for [Seu Tenant]"**
2. Clique em **"Yes"** para confirmar

✅ Status deve ficar: **"Granted for [Seu Tenant]"** com checkmark verde

---

## 📋 Passo 5: Atribuir Usuário ao Aplicativo

### 5.1 Acessar Enterprise Applications
1. Volte para **Microsoft Entra ID** (menu principal)
2. Clique em **"Enterprise applications"**
3. Procure por **"Concilia Brasil Auth"** na busca
4. Clique no app

### 5.2 Atribuir usuário admin
1. No menu lateral, clique em **"Users and groups"**
2. Clique em **"+ Add user/group"**
3. Clique em **"None Selected"** em Users
4. Procure por **`ateraoka@yahoo.com`**
5. Selecione o usuário
6. Clique em **"Select"** (parte inferior)
7. Clique em **"Assign"**

✅ **Usuário admin atribuído ao app!**

---

## 📋 Passo 6: Configurar Variáveis de Ambiente

### 6.1 Criar arquivo `.env.local`
Na raiz do projeto `concilia-brasil`, crie o arquivo `.env.local`:

```bash
# -------------------------
# Microsoft Authentication (Azure AD)
# -------------------------
AZURE_AD_CLIENT_ID=cole-aqui-o-application-client-id
AZURE_AD_CLIENT_SECRET=cole-aqui-o-client-secret-value
AZURE_AD_TENANT_ID=cole-aqui-o-directory-tenant-id
ADMIN_EMAIL=ateraoka@yahoo.com

# -------------------------
# NextAuth
# -------------------------
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere-um-secret-aleatorio-aqui

# -------------------------
# Outras variáveis (COPIE do seu .env existente)
# -------------------------
JWT_SECRET=seu-jwt-secret
DATABASE_URL=sua-connection-string
# ... outras variáveis ...
```

### 6.2 Gerar NEXTAUTH_SECRET
Execute no PowerShell:

```powershell
# Gerar um secret seguro para NextAuth
$bytes = New-Object Byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Copie o resultado** → Vai em `NEXTAUTH_SECRET`

---

## 📋 Passo 7: Testar Localmente

### 7.1 Instalar dependências (se ainda não fez)
```powershell
npm install
```

### 7.2 Rodar aplicação
```powershell
npm run dev
```

### 7.3 Testar login Microsoft
1. Abra http://localhost:3000
2. Clique em **"Entrar com Microsoft"**
3. Você será redirecionado para login da Microsoft
4. Use **`ateraoka@yahoo.com`** e a senha
5. Aceite as permissões (primeira vez)
6. Você será redirecionado para `/dashboard`

✅ **Se funcionou, autenticação local está configurada!**

---

## 📋 Passo 8: Configurar Produção (Azure App Service)

### 8.1 Acessar Configuration no Azure
1. No [Portal do Azure](https://portal.azure.com), procure pelo **App Service** `concilia-brasil`
2. No menu lateral, clique em **"Configuration"**
3. Clique em **"Application settings"**

### 8.2 Adicionar variáveis de ambiente
Clique em **"+ New application setting"** para cada uma:

| Name | Value (exemplo) |
|------|-----------------|
| `AZURE_AD_CLIENT_ID` | `12345678-1234-1234-1234-123456789abc` |
| `AZURE_AD_CLIENT_SECRET` | `a1B2c3D4~eF5gH6iJ7kL8...` |
| `AZURE_AD_TENANT_ID` | `87654321-1234-1234-1234-123456789xyz` |
| `ADMIN_EMAIL` | `ateraoka@yahoo.com` |
| `NEXTAUTH_URL` | `https://concilia-brasil.azurewebsites.net` |
| `NEXTAUTH_SECRET` | (o mesmo gerado no Passo 6.2) |

### 8.3 Salvar configurações
1. Clique em **"Save"** (no topo)
2. Clique em **"Continue"** quando perguntar se pode reiniciar o app
3. Aguarde o App Service reiniciar (~30s)

---

## 📋 Passo 9: Deploy e Migração

### 9.1 Fazer commit das mudanças
```powershell
git add .
git commit -m "feat: Microsoft Authentication integration"
git push origin main
```

### 9.2 Aguardar deploy (GitHub Actions)
- Acesse https://github.com/seu-usuario/concilia-brasil/actions
- Aguarde o workflow completar (~3-5min com cache otimizado)

### 9.3 Rodar migração do banco de dados
Como o banco está na nuvem, a migração rodará automaticamente no primeiro deploy.

Se precisar rodar manualmente no Azure:
1. No Portal do Azure, acesse o **App Service**
2. Vá em **Advanced Tools** → **Go** (abre Kudu)
3. Clique em **SSH** no menu superior
4. Execute:
```bash
cd /home/site/wwwroot
npx prisma migrate deploy
```

---

## 📋 Passo 10: Testar Produção

### 10.1 Acessar aplicação em produção
```
https://concilia-brasil.azurewebsites.net
```

### 10.2 Testar login Microsoft
1. Clique em **"Entrar com Microsoft"**
2. Use `ateraoka@yahoo.com`
3. Verifique se redireciona para `/dashboard`
4. Verifique se role é **ADMIN**

### 10.3 Verificar usuário no banco
No Azure Data Studio ou Kudu SSH:
```sql
SELECT id, email, name, role, "companyId", "microsoftId"
FROM "User"
WHERE email = 'ateraoka@yahoo.com';
```

✅ Deve mostrar:
- `role`: `ADMIN`
- `microsoftId`: `12345678-1234-...` (ID do Azure AD)
- `companyId`: (uuid da company criada automaticamente)

---

## ✅ Checklist Final

Marque cada item conforme completar:

### Azure Portal
- [ ] App Registration criado: "Concilia Brasil Auth"
- [ ] Redirect URIs configurados (local + produção)
- [ ] Application (client) ID copiado
- [ ] Directory (tenant) ID copiado
- [ ] Client Secret criado e Value copiado
- [ ] API permissions configurados e consentimento concedido
- [ ] Usuário `ateraoka@yahoo.com` atribuído ao app

### Ambiente Local
- [ ] Arquivo `.env.local` criado com todas as variáveis
- [ ] `NEXTAUTH_SECRET` gerado e configurado
- [ ] `npm install` executado com sucesso
- [ ] `npm run dev` rodando sem erros
- [ ] Teste de login Microsoft funcionando localmente

### Azure App Service Production
- [ ] Variáveis de ambiente configuradas no App Service
- [ ] `NEXTAUTH_URL` apontando para produção
- [ ] App Service reiniciado após configuração
- [ ] Código com autenticação Microsoft commitado
- [ ] Deploy via GitHub Actions concluído
- [ ] Migração do banco executada
- [ ] Teste de login Microsoft funcionando em produção
- [ ] Usuário admin criado no banco automaticamente

---

## 🚨 Troubleshooting

### Erro: "redirect_uri_mismatch"
- **Causa:** Redirect URI no Azure AD não corresponde à URL da aplicação
- **Solução:** Verifique se o redirect URI no App Registration inclui:
  - Local: `http://localhost:3000/api/auth/callback/azure-ad`
  - Prod: `https://concilia-brasil.azurewebsites.net/api/auth/callback/azure-ad`

### Erro: "invalid_client"
- **Causa:** Client Secret expirado ou incorreto
- **Solução:** 
  - Crie um novo Client Secret no Azure
  - Atualize `AZURE_AD_CLIENT_SECRET` no `.env.local` e no Azure App Service

### Erro: "User not authorized"
- **Causa:** Usuário não está atribuído ao Enterprise Application
- **Solução:** Volte ao Passo 5 e atribua o usuário

### Login funciona mas não cria usuário no banco
- **Causa:** `signIn` callback no NextAuth falhando
- **Solução:** 
  - Verifique variável `ADMIN_EMAIL` no `.env.local`
  - Verifique logs do console no browser (F12 → Console)
  - Verifique logs do Azure App Service (Passo 11 abaixo)

---

## 📊 Passo 11: Monitoramento (Extra)

### 11.1 Ver logs do Azure App Service
```powershell
# No portal do Azure, App Service → Log stream
# Ou via CLI:
az webapp log tail --name concilia-brasil --resource-group seu-resource-group
```

### 11.2 Verificar autenticações bem-sucedidas
Procure nos logs por:
```
[AuthInfo] Login success
[AuthInfo] User created from Microsoft account
```

---

## 🎉 Conclusão

Após completar todos os passos, você terá:

✅ Autenticação híbrida:
- Email/senha tradicional (mantido para compatibilidade)
- Microsoft Single Sign-On (Azure AD)

✅ Administrador configurado:
- `ateraoka@yahoo.com` com role `ADMIN`
- Criado automaticamente no primeiro login

✅ Segurança:
- OAuth 2.0 com Azure AD
- MFA suportado (se habilitado no Azure AD)
- JWT seguro com NextAuth

✅ Escalabilidade:
- Fácil adicionar novos usuários no Azure AD
- Usuários criados automaticamente no banco
- Company opcional para usuários Microsoft

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do browser (F12 → Console)
2. Logs do Next.js local (`npm run dev`)
3. Logs do Azure App Service (Log stream)
4. Checklist acima para garantir que todos os passos foram feitos

**Contato:** atera (desenvolvedor)
**Data:** Janeiro 2025
