import {
  AIFileInput,
  AIProvider,
  CompanyInsight,
  ExtractedTransaction,
} from "./AIProvider";

export class AzureOpenAIProvider implements AIProvider {
  async extractTransactions(file: AIFileInput): Promise<ExtractedTransaction[]> {
    void file;
    throw new Error("AzureOpenAIProvider ainda não foi implementado");
  }

  async classifyTransaction(text: string): Promise<"income" | "expense" | "unknown"> {
    void text;
    throw new Error("AzureOpenAIProvider ainda não foi implementado");
  }

  async generateInsights(companyId: string): Promise<CompanyInsight[]> {
    void companyId;
    throw new Error("AzureOpenAIProvider ainda não foi implementado");
  }
}
