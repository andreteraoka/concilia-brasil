# 02 — Classificação de Documento + Detecção de Lixo

**Objetivo**

Classificar automaticamente o documento (EXTRATO, BOLETO, NOTA, RECIBO, CONTRATO, OUTRO ou REJECT), bloquear conteúdos irrelevantes e indicar a rota de processamento.

**Entradas esperadas**

- `ocr_json`: resumo de texto/headers do OCR.
- `file_meta`: nome, tipo, tamanho, hash.

**Saída esperada (JSON)**

```json
{
  "doc_type": "BANK_STATEMENT|INVOICE|BOLETO|RECEIPT|CONTRACT|OTHER|REJECT",
  "confidence": 0.0,
  "reasons": ["string"],
  "route": "extract_bank_statement|extract_invoice|skip",
  "security_flags": ["PII_DETECTED|SUSPECTED_CREDENTIALS|NONE"]
}
```

## Prompt template

Classifique o documento em: BANK_STATEMENT, INVOICE, BOLETO, RECEIPT, CONTRACT, OTHER ou REJECT.
- Use ocr_json (texto + campos) e file_meta (nome/tipo).
- Marque REJECT quando for capa, página em branco, propaganda ou conteúdo irrelevante para finanças.
- Retorne "route" sugerida (ex.: extract_bank_statement) ou "skip" para REJECT.
- Popule "security_flags" com PII_DETECTED se houver dados sensíveis desnecessários (ex.: senha, chave privada).
- Seja conservador: se houver dúvida entre BANK_STATEMENT e OTHER, escolha BANK_STATEMENT apenas quando constarem saldos e lançamentos.

Entrada:
- ocr_json: {{ocr_json}}
- file_meta: {{file_meta}}

Saída: JSON com doc_type, confidence (0–1), reasons[], route, security_flags[].
Sem texto fora do JSON.

## Parâmetros recomendados

- temperature: 0
- top_p: 0.1
- max_tokens: 400
