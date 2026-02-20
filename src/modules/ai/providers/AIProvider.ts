export interface AIFileInput {
  fileName: string;
  mimeType?: string;
  contentBase64?: string;
  textContent?: string;
}

export interface ExtractedTransaction {
  date?: string;
  description: string;
  amount: number;
  type?: "income" | "expense";
  confidence?: number;
}

export interface CompanyInsight {
  title: string;
  description: string;
  impact?: "low" | "medium" | "high";
}

export interface AIProvider {
  extractTransactions(file: AIFileInput): Promise<ExtractedTransaction[]>;
  classifyTransaction(text: string): Promise<"income" | "expense" | "unknown">;
  generateInsights(companyId: string): Promise<CompanyInsight[]>;
}
