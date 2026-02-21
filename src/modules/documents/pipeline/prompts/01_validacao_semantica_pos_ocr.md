# 01 — Validação Semântica Pós-OCR

**Objetivo**

Validar e normalizar a extração do OCR para documentos financeiros, detectando inconsistências numéricas, campos ausentes e calculando níveis de confiança.

**Entradas esperadas**

- `ocr_json`: JSON bruto do Azure Document Intelligence com texto, campos e estruturas extraídas.
- `document_meta`: Metadados opcionais do arquivo (nome, tipo, tamanho, hash).

**Saída esperada (JSON)**

```json
{
  "is_valid": true,
  "confidence_overall": 0.85,
  "normalized": {
    "bank_name": "string",
    "account_last4": "1234",
    "currency": "BRL",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31",
    "opening_balance": 1000.00,
    "closing_balance": 1500.00,
    "transactions": [
      {
        "date": "2024-01-15",
        "description": "Pagamento recebido",
        "amount": 500.00,
        "type": "CREDIT",
        "category_guess": "receita",
        "confidence": 0.9
      }
    ]
  },
  "issues": [
    {
      "code": "BALANCE_MISMATCH",
      "message": "Soma de transações não coincide com saldo final"
    }
  ],
  "needs_human_review": false
}
```

## Prompt template

Você é um auditor financeiro especializado em validar extrações de OCR.
Receba o JSON bruto do OCR (Azure Document Intelligence) e:
1) Detecte inconsistências (soma de créditos/débitos vs. saldos; datas fora do período; campos ausentes).
2) Normalize os campos para o schema alvo (abaixo).
3) Atribua "confidence_overall" (0–1) e "confidence" por transação.
4) Liste "issues" com códigos padronizados e defina "needs_human_review".

**Schema alvo:**
- bank_name, account_last4, currency (ISO), period_start/end (YYYY-MM-DD),
  opening_balance, closing_balance, transactions[date, description, amount, type, category_guess, confidence].

**Regras:**
- Assuma moeda BRL se ausente.
- Corrija sinais: crédito = positivo; débito = negativo.
- NÃO invente valores: se ausente, registre issue MISSING_FIELD.
- Em conflitos numéricos, prefira saldos totais e sinalize BALANCE_MISMATCH.

**Entrada:**
- ocr_json: {{ocr_json}}
- document_meta: {{document_meta}}

**Saída:** UM ÚNICO objeto JSON válido conforme o schema. Não inclua texto fora do JSON.

## Parâmetros recomendados

- temperature: 0.1
- top_p: 0.1
- max_tokens: 1800

## Códigos de issue padronizados

- `MISSING_FIELD`: Campo obrigatório ausente no OCR
- `BALANCE_MISMATCH`: Inconsistência entre saldos e soma de transações
- `DATE_OUT_OF_RANGE`: Data de transação fora do período declarado
- `INVALID_AMOUNT`: Valor numérico inválido ou corrompido
- `AMBIGUOUS_TYPE`: Impossível determinar se é CREDIT ou DEBIT
- `LOW_CONFIDENCE`: Confiança geral abaixo do limiar aceitável (< 0.7)
