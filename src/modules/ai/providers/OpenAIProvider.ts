import OpenAI from "openai";
import {
  AIFileInput,
  AIProvider,
  CompanyInsight,
  ExtractedTransaction,
} from "./AIProvider";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    this.client = new OpenAI({ apiKey });
    this.model = options?.model || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  }

  async extractTransactions(file: AIFileInput): Promise<ExtractedTransaction[]> {
    const rawContent =
      file.textContent ||
      (file.contentBase64 ? `base64:${file.contentBase64.slice(0, 10000)}` : "");

    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você extrai transações financeiras e responde apenas JSON válido no formato { \"transactions\": [...] }.",
        },
        {
          role: "user",
          content: `Arquivo: ${file.fileName}\nTipo: ${file.mimeType || "desconhecido"}\nConteúdo:\n${rawContent}`,
        },
      ],
    });

    const payload = completion.choices[0]?.message?.content || "{}";
    const parsed = parseJson<{ transactions?: ExtractedTransaction[] }>(payload);
    return parsed.transactions || [];
  }

  async classifyTransaction(text: string): Promise<"income" | "expense" | "unknown"> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Classifique a transação como income, expense ou unknown. Responda apenas JSON no formato { \"classification\": \"income|expense|unknown\" }.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const payload = completion.choices[0]?.message?.content || "{}";
    const parsed = parseJson<{ classification?: "income" | "expense" | "unknown" }>(payload);
    return parsed.classification || "unknown";
  }

  async generateInsights(companyId: string): Promise<CompanyInsight[]> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Gere insights financeiros objetivos para uma empresa e responda apenas JSON no formato { \"insights\": [{\"title\": string, \"description\": string, \"impact\": \"low|medium|high\"}] }.",
        },
        {
          role: "user",
          content: `Gerar insights para companyId=${companyId}`,
        },
      ],
    });

    const payload = completion.choices[0]?.message?.content || "{}";
    const parsed = parseJson<{ insights?: CompanyInsight[] }>(payload);
    return parsed.insights || [];
  }
}
