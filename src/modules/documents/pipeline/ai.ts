import { DOCUMENT_TYPES, ClassificationOutput, DocumentType, FieldsOutput } from "./types";

const EMPTY_FIELDS: FieldsOutput = {
  issuerName: null,
  issuerId: null,
  customerName: null,
  customerId: null,
  documentNumber: null,
  bankName: null,
  accountLast4: null,
  issueDate: null,
  dueDate: null,
  periodStart: null,
  periodEnd: null,
  totalAmount: null,
  currency: "BRL",
  barcode: null,
  pixKey: null,
  nfAccessKey: null,
};

function hasAzureOpenAIConfig() {
  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT &&
      process.env.AZURE_OPENAI_API_VERSION
  );
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return value;
  }

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function normalizeDocumentType(value: unknown): DocumentType {
  if (typeof value !== "string") {
    return "OUTRO";
  }

  const normalized = value.trim().toUpperCase();
  return (DOCUMENT_TYPES.find((item) => item === normalized) || "OUTRO") as DocumentType;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function fallbackClassification(text: string): ClassificationOutput {
  const lower = text.toLowerCase();
  const rules: Array<{ type: DocumentType; terms: string[]; confidence: number }> = [
    { type: "NFE", terms: ["nota fiscal", "chave de acesso", "danfe"], confidence: 0.7 },
    { type: "BOLETO", terms: ["linha digitável", "boleto", "vencimento"], confidence: 0.7 },
    { type: "FATURA_CARTAO", terms: ["fatura", "cartão", "limite total"], confidence: 0.68 },
    { type: "FATURA_TELEFONE", terms: ["telefone", "operadora", "plano"], confidence: 0.66 },
    { type: "EXTRATO_BANCARIO", terms: ["extrato", "saldo anterior", "saldo final"], confidence: 0.7 },
    { type: "COMPROVANTE_PAGAMENTO", terms: ["comprovante", "transação", "pix"], confidence: 0.65 },
    { type: "CCB", terms: ["cédula de crédito bancário", "ccb"], confidence: 0.72 },
    { type: "RECIBO", terms: ["recibo", "recebi de"], confidence: 0.62 },
  ];

  const found = rules.find((rule) => rule.terms.some((term) => lower.includes(term)));
  const tags = found ? found.terms.filter((term) => lower.includes(term)).slice(0, 5) : [];

  return {
    documentType: found?.type || "OUTRO",
    confidence: found?.confidence || 0.3,
    summary: text.slice(0, 180) || "Sem conteúdo textual para classificação",
    tags,
  };
}

function coerceFields(input: Record<string, unknown> | undefined): FieldsOutput {
  const fields = input || {};

  return {
    issuerName: typeof fields.issuerName === "string" ? fields.issuerName : null,
    issuerId: typeof fields.issuerId === "string" ? fields.issuerId : null,
    customerName: typeof fields.customerName === "string" ? fields.customerName : null,
    customerId: typeof fields.customerId === "string" ? fields.customerId : null,
    documentNumber: typeof fields.documentNumber === "string" ? fields.documentNumber : null,
    bankName: typeof fields.bankName === "string" ? fields.bankName : null,
    accountLast4: typeof fields.accountLast4 === "string" ? fields.accountLast4 : null,
    issueDate: normalizeDate(fields.issueDate),
    dueDate: normalizeDate(fields.dueDate),
    periodStart: normalizeDate(fields.periodStart),
    periodEnd: normalizeDate(fields.periodEnd),
    totalAmount: normalizeNumber(fields.totalAmount),
    currency: "BRL",
    barcode: typeof fields.barcode === "string" ? fields.barcode : null,
    pixKey: typeof fields.pixKey === "string" ? fields.pixKey : null,
    nfAccessKey: typeof fields.nfAccessKey === "string" ? fields.nfAccessKey : null,
  };
}

export async function analyzeWithAI(text: string): Promise<{
  classification: ClassificationOutput;
  fields: FieldsOutput;
  errors: string[];
}> {
  if (!text.trim()) {
    return {
      classification: {
        documentType: "OUTRO",
        confidence: 0,
        summary: "Sem texto extraído para análise",
        tags: [],
      },
      fields: { ...EMPTY_FIELDS },
      errors: ["no_extracted_text"],
    };
  }

  if (!hasAzureOpenAIConfig()) {
    return {
      classification: fallbackClassification(text),
      fields: { ...EMPTY_FIELDS },
      errors: ["azure_openai_not_configured"],
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const systemPrompt = [
    "Você classifica e extrai dados de documentos financeiros brasileiros.",
    "Regras obrigatórias:",
    "1) Responda apenas JSON válido, sem markdown.",
    "2) Não invente dados. Se não constar no texto, use null.",
    "3) documentType deve ser exatamente um enum permitido.",
    "4) Datas em YYYY-MM-DD quando possível.",
    "5) currency sempre BRL.",
    "6) totalAmount deve ser numérico ou null.",
    "Enum permitido: EXTRATO_BANCARIO, RECIBO, CCB, FATURA_CARTAO, FATURA_TELEFONE, NFE, BOLETO, COMPROVANTE_PAGAMENTO, OUTRO.",
    "Retorne no formato: {classification:{documentType,confidence,summary,tags},fields:{issuerName,issuerId,customerName,customerId,documentNumber,bankName,accountLast4,issueDate,dueDate,periodStart,periodEnd,totalAmount,currency,barcode,pixKey,nfAccessKey}}",
  ].join("\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 60000) },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        classification: fallbackClassification(text),
        fields: { ...EMPTY_FIELDS },
        errors: [`azure_openai_error: ${detail}`],
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = payload.choices?.[0]?.message?.content;
    if (!rawContent) {
      return {
        classification: fallbackClassification(text),
        fields: { ...EMPTY_FIELDS },
        errors: ["azure_openai_empty_response"],
      };
    }

    const parsed = JSON.parse(rawContent) as {
      classification?: {
        documentType?: unknown;
        confidence?: unknown;
        summary?: unknown;
        tags?: unknown;
      };
      fields?: Record<string, unknown>;
    };

    const classification: ClassificationOutput = {
      documentType: normalizeDocumentType(parsed.classification?.documentType),
      confidence:
        typeof parsed.classification?.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.classification.confidence))
          : 0.5,
      summary:
        typeof parsed.classification?.summary === "string"
          ? parsed.classification.summary
          : "Classificação realizada",
      tags: Array.isArray(parsed.classification?.tags)
        ? parsed.classification?.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 10)
        : [],
    };

    return {
      classification,
      fields: coerceFields(parsed.fields),
      errors: [],
    };
  } catch (error) {
    return {
      classification: fallbackClassification(text),
      fields: { ...EMPTY_FIELDS },
      errors: [error instanceof Error ? `azure_openai_exception: ${error.message}` : "azure_openai_exception"],
    };
  }
}
