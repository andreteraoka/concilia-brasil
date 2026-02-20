# Guia de Segurança para Produção

Este documento contém as melhores práticas e checklist de segurança para deployar a aplicação Concília Brasil em produção.

---

## 1. Variáveis de Ambiente

### Checklist de Variáveis Críticas

- [ ] `NODE_ENV=production` - Deve ser explicitamente definido como "production"
- [ ] `JWT_SECRET` - Alterar de "dev-secret" para uma chave única e forte (mínimo 32 caracteres)
- [ ] `DATABASE_URL` - Apontar para banco de produção com SSL/TLS habilitado
- [ ] `ALLOWED_ORIGINS` - Definir domínios específicos (nunca use "*")
- [ ] `OPENAI_API_KEY` - Proteger e rotacionar regularmente
- [ ] `APP_NAME` - Identificação única da aplicação

### Exemplo de .env.production

```bash
NODE_ENV=production
APP_NAME=concilia-brasil-prod

# Database
DATABASE_URL=postgresql://user:secure-password@prod-db.provider.com:5432/concilia_prod?sslmode=require

# Authentication
JWT_SECRET=your-very-long-random-secret-key-min-32-chars-abcdef123456789

# API Configuration
ALLOWED_ORIGINS=https://app.seu-dominio.com.br,https://api.seu-dominio.com.br

# Security
ENABLE_SECURITY_HEADERS=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 2. Autenticação e Autorização

### Segurança de Senhas ✅

- [x] Senhas são hash com bcrypt (12 rounds em produção)
- [x] Validação de força de senha implementada
- [x] Senhas nunca são armazenadas em logs
- [ ] Implementar política de expiração de senha (90 dias)
- [ ] Implementar histórico de senhas (últimas 5)
- [ ] Alertar usuário sobre login de novo local

### JWT (JSON Web Tokens) ✅

- [x] Expiração configurada (1 dia em produção)
- [x] Algoritmo HS256 implementado
- [x] Token armazenado em cookie httpOnly (seguro)
- [ ] Implementar refresh token com expiração longa (7 dias)
- [ ] Implementar token revocation lista
- [ ] Adicionar IP do cliente no token (opcional)

### Autorização ✅

- [x] Role-Based Access Control (RBAC) implementado
- [x] Middleware valida role em cada request protegido
- [x] Respostas 403 (Acesso Negado) para acesso não autorizado
- [x] Respostas 404 (Não Encontrado) para recursos de outras empresas
- [ ] Implementar auditoria de mudanças de role
- [ ] Implementar aprovação de promoções de admin

---

## 3. Segurança de API

### Validação de Entrada ✅

- [x] Zod schemas implementados para todas APIs
- [x] Validação de email, telefone, CNPJ
- [x] Limite de tamanho de payload (10MB)
- [x] Validação de tipos de dados
- [x] Proteção contra SQL injection (Prisma)
- [ ] Implementar rate limiting por usuário
- [ ] Adicionar validação de CAPTCHA para registro

### Tratamento de Erros ✅

- [x] Error handler centralizado criado
- [x] Erros não expõem stacktrace em produção
- [x] Mensagens de erro genéricas no cliente
- [x] Logs detalhados no servidor (não em production)
- [x] Request ID para rastreamento de erros
- [ ] Configurar alertas para 5xx errors

### Headers de Segurança ✅

- [x] X-Frame-Options: DENY (previne clickjacking)
- [x] X-Content-Type-Options: nosniff (previne MIME sniffing)
- [x] X-XSS-Protection: 1; mode=block (proteção XSS)
- [x] Content-Security-Policy (CSP) configurado
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] HSTS: max-age=31536000 (apenas em HTTPS)
- [ ] Implementar Public-Key-Pins (HPKP)
- [ ] Implementar Expect-CT header

---

## 4. Proteção de Dados

### Multi-Tenancy ✅

- [x] Todas queries filtram por companyId
- [x] Soft delete com campo deletedAt
- [x] Deleted records excluídos de queries
- [x] Cross-company access retorna 404
- [ ] Implementar column-level encryption para dados sensíveis
- [ ] Backups isolados por empresa

### Criptografia

- [ ] Implementar TLS 1.3 para todas conexões
- [ ] Ativar SSL/TLS em conexão com banco de dados
- [ ] Considerar criptografia de dados em repouso
- [ ] Gerenciar chaves de criptografia de forma segura

### Privacidade de Dados

- [ ] LGPD compliance verification
- [ ] Data retention policy (quanto tempo guardar dados)
- [ ] Direito ao esquecimento implementado
- [ ] Consentimento do usuário para processamento
- [ ] Política de privacidade atualizada

---

## 5. Infraestrutura e Deployment

### Database

- [ ] Backup automático (diário)
- [ ] Teste regular de restore
- [ ] Replicação para disaster recovery
- [ ] Monitoramento de performance
- [ ] Índices criados para queries frequentes
- [ ] Rotina de vacuum/maintenance

### Application Server

- [ ] Usando HTTPS/TLS
- [ ] Proteção DDoS configurada
- [ ] Auto-scaling habilitado
- [ ] Health check configurado
- [ ] Logs centralizados
- [ ] Monitoramento de CPU/Memory

### Secrets Management

- [ ] JWT_SECRET não em git
- [ ] Usar secrets manager (AWS Secrets, hashicorp Vault)
- [ ] Rotação de secrets a cada 90 dias
- [ ] Acesso a secrets auditado
- [ ] Nenhum secret em logs

---

## 6. Segurança do Código

### Dependências

- [ ] Executar `npm audit` regularmente
- [ ] Atualizar dependências vulneráveis
- [ ] Usar versões locked do package-lock.json
- [ ] Revisar mudanças antes de atualizar
- [ ] Monitorar CVE alerts
- [ ] Usar ferramentas como Snyk ou Dependabot

### Código

- [ ] Code review obrigatório antes de merge
- [ ] Testes automatizados com >80% coverage
- [ ] SCA (Static Code Analysis) com ESLint
- [ ] Testes de segurança (SAST)
- [ ] Verificar console.logs removidos
- [ ] Sem dados sensíveis em comentários

---

## 7. Logging e Monitoramento

### Logs ✅

- [x] Estrutura de logging implementada (JSON)
- [x] Diferentes níveis (debug, info, warn, error)
- [x] Request ID para rastreamento
- [x] Não expõe stacktrace em produção
- [ ] Enviar logs para serviço centralizado (ELK, DataDog)
- [ ] Retenção de logs: 90 dias mínimo
- [ ] Acesso a logs auditado

### Alertas

- [ ] Configurar alertas para:
  - Múltiplas tentativas de login falhadas
  - Alterações de role/permissões
  - Operações de admin
  - Erros 5xx
  - Taxa anormal de requests
  - Uso de recursos alto

### Auditoria

- [ ] Log de todas operações sensíveis:
  - Login/Logout
  - Criação/Deleção de usuários
  - Mudanças de role
  - Operações de admin
  - Acesso a relatórios financeiros
- [ ] Rastreabilidade completa (who, what, when, where)

---

## 8. Teste de Segurança

### Testes Automatizados

- [ ] Testes RBAC (role validation)
- [ ] Testes de multi-tenancy isolation
- [ ] Testes de password strength
- [ ] Testes de token expiration
- [ ] Testes de rate limiting

### Teste Manual

- [ ] Penetration testing
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] CSRF protection verification
- [ ] Auth bypass attempts
- [ ] Privilege escalation attempts

### Scanning Externo

- [ ] OWASP Dependency Check
- [ ] Sonarqube ou similar
- [ ] Snyk vulnerability scanning
- [ ] SSL Labs rating (mínimo A)

---

## 9. RGPD / LGPD Compliance

### Requisitos ✅

- [x] Consentimento do usuário para cookies
- [x] Política de privacidade clara
- [x] Direito de acesso aos dados
- [ ] Direito ao esquecimento implementado
- [ ] Portabilidade de dados
- [ ] Notificação de breach em 72h
- [ ] Data Protection Impact Assessment
- [ ] DPO (Data Protection Officer) designado

---

## 10. Checklist Pré-Deploy

### Ambiente de Staging

- [ ] Deploy em staging idêntico ao production
- [ ] Rodar testes automatizados completos
- [ ] Teste de performance com carga
- [ ] Teste de backup/restore
- [ ] Teste de rollback procedure

### Verificações Finais

- [ ] `npm run lint` passa 100%
- [ ] `npm run test` passa 100%
- [ ] Environment variables configuradas
- [ ] Database migrations executadas
- [ ] Secrets carregados corretamente
- [ ] Logs funcionando corretamente
- [ ] Monitoramento/alertas ativos
- [ ] Plano de rollback definido
- [ ] Runbook de deployment criado

### Documentação

- [ ] README.md atualizado
- [ ] Security documentation completo
- [ ] API documentation atualizado
- [ ] Runbooks de operação criados
- [ ] Plano de disaster recovery documentado

---

## 11. Resposta a Incidentes

### Plano de Resposta

- [ ] Processo de relatório de vulnerabilidade
- [ ] Equipe de resposta definida
- [ ] Contatos de emergência listados
- [ ] Procedimento de escalation documentado
- [ ] Processo de comunicação com usuários definido

### Post-Incidente

- [ ] Root cause analysis obrigatória
- [ ] Correção de código implementada
- [ ] Testes adicionados para evitar repetição
- [ ] Lessons learned documentadas
- [ ] Equipe notificada das mudanças

---

## 12. Conformidade e Regulamentação

### Certificações/Auditoria

- [ ] ISO 27001 (Information Security)
- [ ] SOC 2 Type II
- [ ] GDPR compliance audit
- [ ] LGPD compliance audit

### Política de Segurança

- [ ] Política de senha corporativa
- [ ] Política de acesso remoto
- [ ] Política de trabalho remoto
- [ ] Política de uso de dados
- [ ] Política de incidentes

---

## 13. Rotina de Manutenção

### Diária

- [ ] Monitorar dashboards de erro
- [ ] Verificar alertas de segurança
- [ ] Revisar logs de acesso

### Semanal

- [ ] Revisão de vulnerabilidades reportadas
- [ ] Teste de backup
- [ ] Performance review

### Mensal

- [ ] Atualizar dependências
- [ ] Rotação de secrets
- [ ] Revisão de permissões de acesso
- [ ] Audit de logs

### Trimestral

- [ ] Penetration testing
- [ ] Security assessment
- [ ] Disaster recovery drilling
- [ ] Review de política de segurança

---

## 14. Recursos Úteis

### Documentação

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP API Security: https://owasp.org/www-project-api-security/
- CWE Top 25: https://cwe.mitre.org/top25/
- security.txt: https://securitytxt.org/

### Ferramentas

- npm audit: Verificar vulnerabilidades
- Snyk: Scanning de vulnerabilidades
- SonarQube: Análise de código estático
- OWASP ZAP: Teste de segurança automático
- Burp Suite: Teste de penetração

### Contatos

- Security Issues: security@seu-dominio.com.br
- Incident Response: incident-response@seu-dominio.com.br
- DPO: dpo@seu-dominio.com.br

---

## Próximos Passos

1. **Imediato**: Configurar NODE_ENV=production e secrets
2. **Curto Prazo**: Implementar rate limiting e security headers
3. **Médio Prazo**: Adicionar password expiration policy
4. **Longo Prazo**: Penetration testing e SOC 2 audit

---

**Última Atualização**: 20 de Fevereiro de 2026
**Responsável**: Time de Segurança
**Próxima Revisão**: 20 de Maio de 2026
