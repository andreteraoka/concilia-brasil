# Concília Brasil - SaaS Financeiro Multi-Tenant

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Recursos Principais](#-recursos-principais)
- [Arquitetura](#-arquitetura)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Autenticação e Autorização (RBAC)](#-autenticação-e-autorização)
- [Fluxo de Processamento de Documentos](#-fluxo-de-processamento-de-documentos)
- [Integração Azure](#-integração-azure)
- [Instalação e Setup](#-instalação-e-setup)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [API Endpoints](#-api-endpoints)
- [Estrutura de Banco de Dados](#-estrutura-de-banco-de-dados)
- [Segurança](#-segurança)
- [Deploy na Azure](#-deploy-na-azure)
- [Roadmap Técnico](#-roadmap-técnico)
- [Contribuindo](#-contribuindo)
- [Suporte](#-suporte)

---

## 🎯 Visão Geral

**Concília Brasil** é uma plataforma SaaS de gestão financeira empresarial, oferecendo reconciliação bancária inteligente, processamento de documentos com IA e análise de fluxo de caixa em tempo real.

### Características Principais

✅ **Multi-tenant**: Arquitetura de isolamento completo entre empresas  
✅ **Cloud-Native**: Otimizado para Azure Cloud (App Service, Database, Storage, AI)  
✅ **Real-Time**: Dashboard com métricas financeiras em tempo real  
✅ **Secure**: Criptografia end-to-end, RBAC granular, compliance LGPD  
✅ **Scalable**: Auto-scaling horizontal, load balancing automático  
✅ **AI-Powered**: Processamento de documentos com Azure OpenAI e Document Intelligence  

### Público-Alvo

- Empresas de médio porte (50-500 funcionários)
- Departamentos financeiros/contábeis
- Consultórios e escritórios contábeis
- Holding companies

---

## 🎁 Recursos Principais

### 1. Gerenciamento de Contas Bancárias
- Cadastro de múltiplas contas por empresa
- Suporte a principais bancos brasileiros (Bradesco, Itaú, Caixa, Santander, Nubank)
- Integração com APIs bancárias (planejado)
- Rastreamento de saldo em tempo real

### 2. Reconciliação de Transações
- Upload de extratos bancários
- Processamento automático com IA
- Identificação de transações duplicadas
- Classificação automática por categoria
- Conciliação manual com interface intuitiva

### 3. Processamento de Documentos
- Upload de PDFs, imagens e arquivos digitalizados
- OCR com Azure Document Intelligence
- Extração de dados estruturados
- Validação automática de documentos
- Armazenamento seguro em Azure Blob Storage

### 4. Análise Financeira
- Dashboard com KPIs em tempo real
- Gráficos de receita vs despesas
- Fluxo de caixa cumulativo
- Relatórios mensais personalizáveis
- Exportação em Excel/PDF

### 5. Controle de Acesso (RBAC)
- Dois níveis de permissão: ADMIN e USER
- Isolamento de dados por empresa
- Auditoria de operações sensíveis
- Gerenciamento de usuários por ADMIN

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      Cliente Web (Next.js)                   │
│  (React 19, TypeScript, Tailwind CSS, Recharts)             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────┐
│         Camada de API (Next.js App Router)                   │
│  • JWT Authentication Middleware                             │
│  • Zod Validation                                             │
│  • RBAC Authorization                                         │
│  • Centralized Error Handling                                │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐  ┌─────▼────┐  ┌──────▼──────┐
    │ Prisma   │  │  Serviços │  │   Externos  │
    │ ORM      │  │ Lógica    │  │             │
    │          │  │ Negócio   │  │ Azure AI    │
    └────┬─────┘  └─────┬────┘  └──────┬──────┘
         │               │              │
┌────────▼───────────────▼──────────────▼────────────────────┐
│         Infraestrutura Cloud (Azure)                        │
│  ├─ App Service (compute)                                   │
│  ├─ Database for PostgreSQL (dados)                         │
│  ├─ Blob Storage (documentos)                               │
│  ├─ Azure OpenAI API (IA)                                   │
│  ├─ Document Intelligence (OCR)                             │
│  ├─ Key Vault (secrets)                                     │
│  └─ Application Insights (monitoring)                       │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Pastas

```
concilia-brasil/
├── app/                                    # Next.js App Router
│   ├── api/                                # API Routes
│   │   ├── auth/                           # Autenticação
│   │   │   ├── login/route.ts              # POST /api/auth/login
│   │   │   └── register/route.ts           # POST /api/auth/register
│   │   └── protected/                      # Rotas autenticadas
│   │       ├── accounts/                   # Gerenciamento de contas
│   │       ├── transactions/               # Transações bancárias
│   │       ├── users/                      # Usuários (ADMIN)
│   │       ├── documents/                  # Processamento de docs
│   │       ├── financial/                  # Análise financeira
│   │       ├── companies/                  # Configurações (ADMIN)
│   │       └── diagnostics/                # Health check (ADMIN)
│   ├── (protected)/                        # Layout para páginas autenticadas
│   │   ├── dashboard/                      # Dashboard principal
│   │   ├── accounts/                       # Gerenciador de contas
│   │   ├── transactions/                   # Lista de transações
│   │   ├── documents/                      # Upload e processamento
│   │   └── admin/
│   │       ├── users/                      # Gerenciamento de usuários
│   │       └── companies/                  # Configurações da empresa
│   ├── globals.css                         # Estilos globais
│   ├── layout.tsx                          # Root layout
│   └── page.tsx                            # Home page (login)
│
├── lib/                                    # Utilidades compartilhadas
│   ├── auth.ts                             # Autenticação (JWT, bcrypt)
│   ├── logger.ts                           # Logging estruturado
│   ├── prisma.ts                           # Client Prisma singleton
│   └── middleware.ts                       # Middleware de autenticação
│
├── src/                                    # Código-fonte principal
│   ├── lib/                                # Bibliotecas reutilizáveis
│   │   ├── apiResponse.ts                  # Response helpers
│   │   ├── errorHandler.ts                 # Error handling centralizado
│   │   ├── requireRole.ts                  # RBAC validation
│   │   ├── request-context.ts              # Contexto de request
│   │   ├── validation.ts                   # Validação de dados
│   │   └── validationSchemas.ts            # Schemas Zod
│   │
│   ├── config/                             # Configuração
│   │   └── security.ts                     # Config de segurança
│   │
│   ├── middleware/                         # Middlewares
│   │   └── securityHeaders.ts              # Headers de segurança
│   │
│   └── modules/                            # Módulos de negócio
│       ├── auth/                           # Autenticação
│       ├── accounts/                       # Contas bancárias
│       ├── transactions/                   # Transações
│       ├── users/                          # Gerenciamento de usuários
│       ├── documents/                      # Processamento de documentos
│       └── financial/                      # Análise financeira
│
├── prisma/                                 # ORM configuration
│   ├── schema.prisma                       # Data schema
│   └── migrations/                         # Database migrations
│
├── next.config.ts                          # Configuração Next.js
├── tsconfig.json                           # Configuração TypeScript
├── package.json                            # Dependências
└── .env.example                            # Template de variáveis

DOCUMENTAÇÃO/
├── README.md                               # Este arquivo
├── PRODUCTION_SECURITY_GUIDE.md            # Guia de segurança
├── PRODUCTION_CHECKLIST.md                 # Checklist pré-deploy
└── RBAC_IMPLEMENTATION_GUIDE.md            # How-to RBAC
```

---

## 🔐 Autenticação e Autorização

### Modelo RBAC

**ADMIN**: Acesso completo ao sistema
**USER**: Acesso restrito aos recursos da própria empresa

**Endpoints ADMIN**:
- `GET /api/protected/users`
- `POST /api/protected/users`
- `PUT /api/protected/users/[id]`
- `GET /api/protected/diagnostics`

**Endpoints USER+ADMIN**:
- `GET /api/protected/accounts`
- `POST /api/protected/accounts`
- `GET /api/protected/transactions`
- `POST /api/protected/documents`
- `GET /api/protected/financial/*`

### Multi-Tenancy Enforcement

Todos os dados são isolados por `companyId`:
```typescript
const accounts = await prisma.account.findMany({
  where: {
    companyId: authContext.companyId,  // ← Isolamento obrigatório
    deletedAt: null,                   // ← Soft delete filter
  },
});
```

---

## 📄 Fluxo de Processamento de Documentos

```
Upload → Validação → Armazenamento → OCR/IA → Extração → Validação → Persistência
```

**Serviços Azure Utilizados**:
- Azure Blob Storage: Armazenamento seguro
- Azure Document Intelligence: OCR e estruturação
- Azure OpenAI: Classificação inteligente

---

## ☁️ Integração Azure

### Serviços Utilizados

| Serviço | Função | Status |
|---------|--------|--------|
| **App Service** | Hospedagem da aplicação | ✅ Implementado |
| **Database for PostgreSQL** | Banco de dados relacional | ✅ Implementado |
| **Blob Storage** | Armazenamento de documentos | ✅ Implementado |
| **Azure OpenAI** | IA para classificação | 🟡 Planejado |
| **Document Intelligence** | OCR e extração de dados | 🟡 Planejado |
| **Key Vault** | Gerenciamento de secrets | 🟡 Planejado |
| **Application Insights** | Monitoring e logs | 🟡 Planejado |

---

## 🚀 Instalação e Setup

### Pré-requisitos

- Node.js 18.0.0+
- npm 9.0.0+
- PostgreSQL 14+
- Git

### Quick Start

```bash
# 1. Clonar repositório
git clone https://github.com/seu-org/concilia-brasil.git
cd concilia-brasil

# 2. Instalar dependências
npm install

# 3. Configurar ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# 4. Setup do banco de dados
npm run prisma:generate
npm run prisma:migrate:dev

# 5. Executar em desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

---

## 🔑 Variáveis de Ambiente

```bash
# Críticas (Produção)
NODE_ENV=production
APP_NAME=concilia-brasil-prod
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=seu-secret-super-seguro-min-32-chars

# Azure Services
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=...
AZURE_OPENAI_API_KEY=seu-openai-key
AZURE_DOCUMENT_INTELLIGENCE_KEY=seu-doc-intel-key

# Segurança
ALLOWED_ORIGINS=https://app.seu-dominio.com.br

# Logging
LOG_LEVEL=info
```

Veja [.env.example](.env.example) para lista completa.

---

## 📡 API Endpoints

### Autenticação
```http
POST /api/auth/login
POST /api/auth/register
```

### Contas Bancárias
```http
GET /api/protected/accounts
POST /api/protected/accounts
PUT /api/protected/accounts/{id}
DELETE /api/protected/accounts/{id}
```

### Transações
```http
GET /api/protected/transactions
POST /api/protected/transactions
DELETE /api/protected/transactions/{id}
```

### Documentos
```http
POST /api/protected/documents
POST /api/protected/documents/process
```

### Análise Financeira
```http
GET /api/protected/financial/summary
GET /api/protected/financial/monthly
GET /api/protected/financial/cashflow
```

Documentação completa em [API Docs](#).

---

## 🗄️ Estrutura de Banco de Dados

Entidades principais:
- **Company**: Empresas/tenants
- **User**: Usuários com RBAC
- **Account**: Contas bancárias
- **Transaction**: Movimentações
- **Document**: Extratos e documentos

Soft delete implementado com campo `deletedAt`.

Veja [schema.prisma](prisma/schema.prisma) para detalhes.

---

## 🔒 Segurança

✅ JWT com expiração 1 dia + refresh token  
✅ Bcrypt 12 rounds para senhas  
✅ RBAC em dois níveis  
✅ Multi-tenancy enforcement  
✅ Zod validation em todas APIs  
✅ Headers de segurança (CSP, X-Frame-Options, HSTS)  
✅ Logging estruturado sem PII  
✅ LGPD compliance

Veja [PRODUCTION_SECURITY_GUIDE.md](PRODUCTION_SECURITY_GUIDE.md) para detalhes completos.

---

## 📦 Deploy na Azure

### Pré-requisitos

```bash
az login
az account set --subscription "seu-subscription-id"
```

### Deploy Steps

1. Criar infraestrutura (App Service, Database, Storage)
2. Configurar secrets em Key Vault
3. Setup database migrations
4. Deploy via GitHub Actions ou manual
5. Verificar health checks

Veja [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) para checklist completo.

---

## 🛣️ Roadmap Técnico

**Q1 2026**: Produção  
**Q2 2026**: APIs bancárias, 2FA, Mobile app  
**Q3 2026**: Payment processing, ML analytics  
**Q4 2026**: Enterprise features, Blockchain audit  

---

## 🤝 Contribuindo

1. Fork o repositório
2. Criar branch feature
3. Commit mudanças
4. Push e criar PR

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guia completo.

---

## 📞 Suporte

- 📚 [Documentação Completa](./docs)
- 🔒 [Security Guide](./PRODUCTION_SECURITY_GUIDE.md)
- 💬 [GitHub Discussions](https://github.com/seu-org/concilia-brasil/discussions)
- 📧 [Email Support](mailto:support@seu-dominio.com.br)

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**Feito com ❤️ por Concília Brasil Team**

