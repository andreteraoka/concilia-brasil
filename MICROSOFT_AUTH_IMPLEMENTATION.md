# 🔐 Implementação de Autenticação Microsoft (Azure AD)

## 📋 Visão Geral

Este guia implementa **autenticação híbrida** mantendo o sistema JWT atual + adicionando login via Microsoft (Azure AD/Entra ID).

### Benefícios

✅ Login com conta Microsoft (ateraoka@yahoo.com)  
✅ Single Sign-On (SSO)  
✅ Multi-Factor Authentication (MFA) nativo  
✅ Recuperação de senha gerenciada pela Microsoft  
✅ Mantém compatibilidade com login tradicional  
✅ Zero downtime na migração

---

## 🎯 Requisitos

### 1. Criar App Registration no Azure

```bash
# Login no Azure
az login

# Criar app registration
az ad app create \
  --display-name "Concília Brasil" \
  --web-redirect-uris "https://concilia-brasil.azurewebsites.net/api/auth/microsoft/callback" \
                      "http://localhost:3000/api/auth/microsoft/callback" \
  --enable-id-token-issuance true

# Anotar:
# - Application (client) ID
# - Directory (tenant) ID
```

### 2. Configurar Client Secret

```bash
# Criar secret
az ad app credential reset \
  --id <APPLICATION_ID> \
  --append \
  --display-name "Concilia-Brasil-Secret"

# Anotar o Client Secret retornado
```

### 3. Adicionar Admin como Usuário

No portal Azure (portal.azure.com):
1. Azure Active Directory → Users
2. Adicionar: **ateraoka@yahoo.com** (convidado externo)
3. Definir role: **Global Administrator**

---

## 📦 Instalação de Pacotes

```bash
npm install @azure/msal-node next-auth
npm install --save-dev @types/next-auth
```

---

## 🔧 Variáveis de Ambiente

Adicionar ao `.env.local`:

```bash
# Microsoft Authentication
AZURE_AD_CLIENT_ID=seu-application-id
AZURE_AD_CLIENT_SECRET=seu-client-secret
AZURE_AD_TENANT_ID=seu-tenant-id

# Admin padrão
ADMIN_EMAIL=ateraoka@yahoo.com

# Callback URL (produção)
NEXTAUTH_URL=https://concilia-brasil.azurewebsites.net
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

---

## 💻 Código de Implementação

### 1. Criar configuração NextAuth

**Arquivo**: `lib/microsoft-auth.ts`

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { authService } from "@/src/modules/auth/services/authService";
import { logger } from "@/lib/logger";

// Configuração MSAL
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  },
};

export const msalInstance = new ConfidentialClientApplication(msalConfig);

// Configuração NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    // Provider 1: Microsoft (Azure AD)
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),

    // Provider 2: Email/Senha tradicional (mantém compatibilidade)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await authService.login({
            email: credentials.email,
            password: credentials.password,
          });

          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          };
        } catch (error) {
          logger.authError("Login failed", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Se login via Microsoft
      if (account?.provider === "azure-ad") {
        const email = user.email || profile?.email;

        // Verificar se usuário já existe no banco
        const existingUser = await authService.findUserByEmail(email);

        if (!existingUser) {
          // Criar usuário automaticamente
          const isAdmin = email === process.env.ADMIN_EMAIL;

          await authService.createUserFromMicrosoft({
            email,
            name: user.name || email.split("@")[0],
            microsoftId: account.providerAccountId,
            role: isAdmin ? "ADMIN" : "USER",
          });

          logger.authInfo("User created from Microsoft account", { email });
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }

      if (account?.provider === "azure-ad") {
        token.accessToken = account.access_token;
        token.provider = "microsoft";
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.provider = token.provider as string;
      }

      return session;
    },
  },

  pages: {
    signIn: "/",
    error: "/?error=auth_failed",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 dia
  },

  secret: process.env.NEXTAUTH_SECRET,
};
```

---

### 2. Criar API Route para NextAuth

**Arquivo**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/microsoft-auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

### 3. Criar rota de callback Microsoft

**Arquivo**: `app/api/auth/microsoft/callback/route.ts`

```typescript
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    logger.authError("Microsoft auth error", { error });
    return NextResponse.redirect(new URL("/?error=microsoft_auth_failed", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", req.url));
  }

  // NextAuth processa automaticamente
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

---

### 4. Adicionar método no authService

**Arquivo**: `src/modules/auth/services/authService.ts`

Adicionar métodos:

```typescript
async findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
},

async createUserFromMicrosoft(data: {
  email: string;
  name: string;
  microsoftId: string;
  role: "ADMIN" | "USER";
}) {
  // Criar company padrão se admin
  const company = data.role === "ADMIN"
    ? await prisma.company.create({
        data: { name: "Concília Brasil Admin" },
      })
    : null;

  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: "", // Sem senha, auth via Microsoft
      role: data.role,
      companyId: company?.id,
      microsoftId: data.microsoftId,
    },
  });
},
```

---

### 5. Atualizar Prisma Schema

**Arquivo**: `prisma/schema.prisma`

Adicionar campo:

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String
  password    String
  role        String
  companyId   String?
  microsoftId String?  @unique  // ← Novo campo
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  company     Company? @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([email])
  @@index([microsoftId])
}
```

Rodar migração:

```bash
npm run prisma:migrate:dev -- --name add_microsoft_auth
```

---

### 6. Atualizar página de login

**Arquivo**: `app/page.tsx`

Adicionar botão de login Microsoft:

```typescript
import { signIn } from "next-auth/react";

// No componente:
<button
  onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
>
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
  </svg>
  Entrar com Microsoft
</button>

<div className="text-center text-stone-400 my-4">ou</div>

{/* Formulário email/senha tradicional abaixo */}
```

---

## 🔐 Recuperação de Senha

Com Microsoft Auth, a recuperação é **automática**:

1. Usuário clica "Esqueci minha senha"
2. Redireciona para login Microsoft
3. Microsoft gerencia o processo de recuperação
4. Usuário volta autenticado

**Implementação**:

```typescript
// No formulário de login
<a
  href="/api/auth/signin?provider=azure-ad"
  className="text-amber-500 hover:text-amber-400"
>
  Esqueci minha senha
</a>
```

---

## 🧪 Testes

### Teste local:

```bash
# 1. Configurar .env.local com credenciais Azure
# 2. Iniciar dev server
npm run dev

# 3. Acessar http://localhost:3000
# 4. Clicar "Entrar com Microsoft"
# 5. Login com ateraoka@yahoo.com
```

### Verificar no banco:

```bash
npx prisma studio
# Verificar usuário criado com microsoftId preenchido
```

---

## 🚀 Deploy em Produção

### 1. Adicionar secrets no Azure App Service

```bash
az webapp config appsettings set \
  --resource-group <seu-resource-group> \
  --name concilia-brasil \
  --settings \
    AZURE_AD_CLIENT_ID=<seu-client-id> \
    AZURE_AD_CLIENT_SECRET=<seu-secret> \
    AZURE_AD_TENANT_ID=<seu-tenant-id> \
    ADMIN_EMAIL=ateraoka@yahoo.com \
    NEXTAUTH_URL=https://concilia-brasil.azurewebsites.net \
    NEXTAUTH_SECRET=<gerar-com-openssl>
```

### 2. Atualizar redirect URIs no App Registration

```bash
az ad app update \
  --id <APPLICATION_ID> \
  --web-redirect-uris "https://concilia-brasil.azurewebsites.net/api/auth/microsoft/callback"
```

### 3. Fazer deploy

```bash
git add .
git commit -m "feat(auth): add Microsoft authentication support"
git push origin main
```

---

## 🔒 Segurança

✅ **Client Secret protegido** em variáveis de ambiente  
✅ **HTTPS obrigatório** em produção  
✅ **Token validação** via Microsoft  
✅ **MFA suportado** nativamente  
✅ **Auditoria** via Azure AD logs  
✅ **RBAC mantido** (ADMIN vs USER)

---

## 📊 Comparação

| Recurso | JWT Tradicional | Microsoft Auth |
|---------|-----------------|----------------|
| Recuperação de senha | Manual | Automática ✨ |
| MFA | Implementação manual | Nativo ✅ |
| SSO | Não | Sim ✅ |
| Auditoria | Custom logs | Azure AD ✅ |
| Manutenção | Alta | Baixa ✅ |

---

## 🎯 Próximos Passos

1. [ ] Implementar código acima
2. [ ] Testar localmente com ateraoka@yahoo.com
3. [ ] Deploy em produção
4. [ ] Convidar usuários via Azure AD
5. [ ] Configurar MFA no Azure AD (recomendado)

---

## 📞 Suporte

- [Microsoft Identity Platform](https://learn.microsoft.com/azure/active-directory/develop/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)

---

**Status**: ✅ Pronto para implementação  
**Complexidade**: Média (~2-3 horas)  
**Impacto**: Alto (segurança + UX melhorados)
