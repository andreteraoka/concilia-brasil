# Prompt 04: Insights Narrativos Executivos

## Visão Geral

O **Prompt 04** transforma KPIs financeiros consolidados em resumos executivos narrativos, com alertas contextualizados e projeções de curto prazo. Ideal para dashboards, PDFs executivos ou e-mails automatizados.

## Estrutura

```
src/modules/documents/pipeline/prompts/
├── 04_insights_narrativos_executivos.json  # Definição do prompt
└── 04_insights_narrativos_executivos.md    # Documentação
```

## Como Usar

### 1. Importar a função

```typescript
import { generateExecutiveInsights } from "@/src/modules/documents/pipeline/ai";
```

### 2. Preparar KPIs consolidados

```typescript
const kpis = {
  periodo: "Janeiro 2026",
  entradas_total: 150000.0,
  saidas_total: 120000.0,
  saldo_liquido: 30000.0,
  variacao_vs_anterior: 12.5,
  top_categorias: [
    { nome: "Receita de vendas", valor: 100000.0 },
    { nome: "Folha de pagamento", valor: -60000.0 },
  ],
  saldo_projetado_7dias: 25000.0,
  conciliacoes_pendentes: 3,
  documentos_aguardando_revisao: 5,
};
```

### 3. Gerar insights

```typescript
const resultado = await generateExecutiveInsights({
  kpis,
  audience: "CFO", // "CFO" | "Controller" | "Contador" | "Empreendedor"
  tone: "executivo", // "executivo" | "neutro" | "didático"
});

console.log(resultado.insights.headline);
console.log(resultado.insights.summary);
console.log(resultado.insights.key_points);
console.log(resultado.insights.alerts);
console.log(resultado.insights.one_week_outlook);
```

## Saída Esperada

```json
{
  "headline": "Fluxo positivo em janeiro: +R$ 30 mil líquidos com crescimento de 12,5%",
  "summary": "O mês fechou com entradas de R$ 150 mil e saídas de R$ 120 mil, resultando em superávit de R$ 30 mil. A performance representa crescimento de 12,5% vs. período anterior. Destaque para receita de vendas (R$ 100 mil) compensando folha robusta (R$ 60 mil).",
  "key_points": [
    "Margem líquida de 20% sobre entradas totais",
    "Receitas concentradas: vendas + serviços = 100% do faturamento",
    "3 conciliações pendentes requerem atenção"
  ],
  "alerts": [
    {
      "level": "MEDIUM",
      "message": "5 documentos aguardam revisão humana",
      "recommended_action": "Priorizar revisão para fechar o mês"
    }
  ],
  "one_week_outlook": "Projeção de saldo em R$ 25 mil para próxima semana. Recomenda-se monitorar vencimentos de fornecedores."
}
```

## Audiências e Tons

| Audiência      | Características                                          |
| -------------- | -------------------------------------------------------- |
| **CFO**        | Foco em métricas estratégicas e decisões de investimento |
| **Controller** | Ênfase em controles e conformidade                       |
| **Contador**   | Detalhes técnicos contábeis e fiscais                    |
| **Empreendedor** | Linguagem acessível com recomendações práticas        |

| Tom            | Características                              |
| -------------- | -------------------------------------------- |
| **Executivo**  | Direto, objetivo, orientado a ação           |
| **Neutro**     | Factual, sem opinião ou recomendação         |
| **Didático**   | Explicativo, com contexto educativo          |

## Integração com Dashboard

### Exemplo de rota API

```typescript
// app/api/protected/insights/route.ts
import { generateExecutiveInsights } from "@/src/modules/documents/pipeline/ai";
import { getKPIsFromDatabase } from "@/services/financial";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const audience = (url.searchParams.get("audience") || "CFO") as Audience;
  const tone = (url.searchParams.get("tone") || "executivo") as Tone;

  // Buscar KPIs do banco de dados
  const kpis = await getKPIsFromDatabase({ companyId: "..." });

  const { insights, errors } = await generateExecutiveInsights({
    kpis,
    audience,
    tone,
  });

  return Response.json({ insights, errors });
}
```

### Exemplo de teste local

```bash
# Executar exemplo com KPIs simulados
npx tsx scripts/example-insights.ts
```

## Fallback e Tratamento de Erros

A função opera em modo **fallback local** quando:
- Azure OpenAI não está configurado
- API retorna erro ou timeout
- Resposta inválida ou vazia

O fallback retorna:
```json
{
  "headline": "Resumo executivo indisponível",
  "summary": "Não foi possível gerar insights automaticamente...",
  "key_points": ["Serviço de AI indisponível no momento"],
  "alerts": [
    {
      "level": "MEDIUM",
      "message": "Sistema operando em modo fallback",
      "recommended_action": "Verifique configuração do Azure OpenAI"
    }
  ]
}
```

## Configuração Azure OpenAI

Certifique-se de que as variáveis de ambiente estão definidas:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## Casos de Uso

1. **Dashboard executivo**: Renderizar resumo na página inicial
2. **E-mail automatizado**: Enviar resumo diário/semanal para stakeholders
3. **PDF de fechamento**: Incluir insights no relatório mensal
4. **Alertas proativos**: Acionar notificações baseadas em `alerts.level`
5. **Comparação temporal**: Gerar séries históricas de insights

## Próximos Passos

- [ ] Criar rota API `/api/protected/insights`
- [ ] Adicionar caching de insights (validade 1h)
- [ ] Persistir histórico de insights no banco
- [ ] Criar visualização no dashboard React
- [ ] Integrar com sistema de notificações

## Referências

- [Prompt 01: Validação Semântica](./01_validacao_semantica_pos_ocr.md)
- [Prompt 02: Classificação de Documento](./02_classificacao_documento.md)
- [Prompt 03: Extração Estruturada](./03_extracao_estruturada_schema.md)
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
