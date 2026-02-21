/**
 * Exemplo de uso: Gerar insights executivos a partir de KPIs consolidados
 * 
 * Execute com:
 * npx tsx scripts/example-insights.ts
 */

import { generateExecutiveInsights } from "../src/modules/documents/pipeline/ai";

async function main() {
  // KPIs de exemplo (normalmente viriam do dashboard ou do banco de dados)
  const kpisExemplo = {
    periodo: "Janeiro 2026",
    entradas_total: 150000.0,
    saidas_total: 120000.0,
    saldo_liquido: 30000.0,
    variacao_vs_anterior: 12.5, // percentual
    top_categorias: [
      { nome: "Receita de vendas", valor: 100000.0 },
      { nome: "Prestação de serviços", valor: 50000.0 },
      { nome: "Folha de pagamento", valor: -60000.0 },
      { nome: "Fornecedores", valor: -40000.0 },
    ],
    saldo_projetado_7dias: 25000.0,
    conciliacoes_pendentes: 3,
    documentos_aguardando_revisao: 5,
  };

  console.log("🔍 Gerando insights executivos...\n");

  // Gerar insights para diferentes audiências e tons
  const cenarios = [
    { audience: "CFO" as const, tone: "executivo" as const },
    { audience: "Empreendedor" as const, tone: "didático" as const },
    { audience: "Contador" as const, tone: "neutro" as const },
  ];

  for (const cenario of cenarios) {
    console.log(`\n📊 Audiência: ${cenario.audience} | Tom: ${cenario.tone}`);
    console.log("─".repeat(70));

    const resultado = await generateExecutiveInsights({
      kpis: kpisExemplo,
      audience: cenario.audience,
      tone: cenario.tone,
    });

    if (resultado.errors.length > 0) {
      console.log("⚠️  Erros:", resultado.errors.join(", "));
    }

    console.log("\n📌 Headline:");
    console.log(resultado.insights.headline);

    console.log("\n📝 Summary:");
    console.log(resultado.insights.summary);

    console.log("\n✨ Key Points:");
    resultado.insights.key_points.forEach((point, idx) => {
      console.log(`  ${idx + 1}. ${point}`);
    });

    if (resultado.insights.alerts && resultado.insights.alerts.length > 0) {
      console.log("\n🚨 Alerts:");
      resultado.insights.alerts.forEach((alert) => {
        const icon = alert.level === "HIGH" ? "🔴" : alert.level === "MEDIUM" ? "🟡" : "🟢";
        console.log(`  ${icon} [${alert.level}] ${alert.message}`);
        if (alert.recommended_action) {
          console.log(`     → Ação: ${alert.recommended_action}`);
        }
      });
    }

    if (resultado.insights.one_week_outlook) {
      console.log("\n🔮 Projeção 1 semana:");
      console.log(resultado.insights.one_week_outlook);
    }

    console.log();
  }

  console.log("\n✅ Exemplo concluído!");
}

main().catch((error) => {
  console.error("❌ Erro ao executar exemplo:", error);
  process.exit(1);
});
