# 03 — Extração Estruturada Orientada a Esquema (Pronto para PostgreSQL/Prisma)

**Objetivo**

Converter o documento validado em um payload pronto para persistência, respeitando multi-tenant (`companyId`) e mapeando contas/transações/documento.

**Entradas esperadas**

- `validated_doc`: saída "normalized" da etapa de validação (Prompt 01).
- `tenant_context`: `{ companyId, timezone, currency_default }`.

**Saída esperada (JSON)**

```json
{
  "companyId": "uuid",
  "accounts": [
    {
      "externalRef": "string",
      "bankName": "string",
      "last4": "string",
      "currency": "BRL"
    }
  ],
  "transactions": [
    {
      "accountRef": "string",
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": 0.0,
      "type": "CREDIT|DEBIT",
      "category": "string",
      "sourceDocId": "uuid"
    }
  ],
  "document": {
    "source": "blob://container/key",
    "originalFilename": "string",
    "period_start": "YYYY-MM-DD",
    "period_end": "YYYY-MM-DD",
    "closing_balance": 0.0,
    "issues": ["..."],
    "accuracyScore": 0.0
  }
}
```

## Prompt template

Converta o documento validado (validated_doc) em um payload pronto para persistência (PostgreSQL/Prisma),
respeitando multi-tenant (companyId) e as regras:

Regras:
- "accounts[].externalRef" pode ser composto por bank_name + last4.
- "transactions[].accountRef" deve referenciar um accounts[].externalRef existente.
- "amount": positivo para crédito e negativo para débito.
- "category": normalize para um conjunto curto (ex.: RECEITAS, DESPESAS, TARIFAS, IMPOSTOS, TRANSFERENCIAS, OUTROS).
- "document.source": use a URI do Blob se disponível; se ausente, deixe vazio e NÃO invente.

Entrada:
- validated_doc: {{validated_doc}}
- tenant_context: {{tenant_context}}

Saída: Um único JSON no schema especificado. Sem comentários ou texto adicional.

## Parâmetros recomendados

- temperature: 0.1
- top_p: 0.1
- max_tokens: 1200

## Notas

- Faça a persistência em transação única no backend.
- Registre sourceDocId (UUID do documento persistido) para rastreabilidade.
