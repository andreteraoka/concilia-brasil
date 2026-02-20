import { AzureOpenAIProvider } from "../providers/AzureOpenAIProvider";
import {
  AIFileInput,
  AIProvider,
  CompanyInsight,
  ExtractedTransaction,
} from "../providers/AIProvider";
import { OpenAIProvider } from "../providers/OpenAIProvider";

function createProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "openai";

  if (provider === "azure-openai") {
    return new AzureOpenAIProvider();
  }

  return new OpenAIProvider();
}

class AIService {
  private readonly provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || createProvider();
  }

  extractTransactions(file: AIFileInput): Promise<ExtractedTransaction[]> {
    return this.provider.extractTransactions(file);
  }

  classifyTransaction(text: string): Promise<"income" | "expense" | "unknown"> {
    return this.provider.classifyTransaction(text);
  }

  generateInsights(companyId: string): Promise<CompanyInsight[]> {
    return this.provider.generateInsights(companyId);
  }
}

export const aiService = new AIService();
export { AIService };
