# 04 — Insights Narrativos Executivos (Storytelling Financeiro)

**Objetivo**

Transformar KPIs consolidados em um resumo gerencial claro (dashboard/e-mail/PDF), com alertas e recomendações.

**Entradas esperadas**

- `kpis`: métricas do período (entradas, saídas, variação vs. anterior, top categorias, saldo projetado, conciliações pendentes etc.).
- `audience`: `"CFO" | "Controller" | "Contador" | "Empreendedor"`.
- `tone`: `"executivo" | "neutro" | "didático"`.

**Saída esperada (JSON)**

```json
{
  "headline": "string",
  "summary": "string",
  "key_points": ["string", "string"],
  "alerts": [
    {
      "level": "HIGH|MEDIUM|LOW",
      "message": "string",
      "recommended_action": "string"
    }
  ],
  "one_week_outlook": "string"
}
```

## Prompt template

Atue como um analista financeiro sênior. Receba KPIs consolidados do período atual e anterior.
Gere um "executive brief" com:
- headline direta,
- summary (3–5 frases),
- key_points objetivos,
- alerts com nível de severidade e ação recomendada,
- one_week_outlook (projeção curta de caixa/risco).

Contexto:
- público-alvo: {{audience}},
- tom: {{tone}},
- moeda BRL, números em pt-BR (separador de milhar e vírgula decimal),
- NÃO reescreva números; use os que vierem nos KPIs,
- NÃO invente dados ausentes.

Entrada (kpis): {{kpis}}

Saída: um único objeto JSON conforme o schema. Sem texto fora do JSON.

## Parâmetros recomendados

- temperature: 0.4
- top_p: 0.9
- max_tokens: 700

## Notas

- Ideal para renderizar no dashboard ou compor um PDF executivo.
- Registre alertas em telemetria para follow-up automático.
- Use este prompt após consolidar KPIs de transações, accounts e financial metrics.
- Os alertas devem ser acionáveis e específicos ao contexto do negócio.
