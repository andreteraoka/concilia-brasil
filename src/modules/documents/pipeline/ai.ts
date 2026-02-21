import semanticValidationPrompt from "./prompts/01_validacao_semantica_pos_ocr.json";
import routeClassificationPrompt from "./prompts/02_classificacao_documento.json";
import structuredSchemaPrompt from "./prompts/03_extracao_estruturada_schema.json";
import executiveInsightsPrompt from "./prompts/04_insights_narrativos_executivos.json";
import {
  DOCUMENT_TYPES,
  ClassificationOutput,
  DocumentType,
  FieldsOutput,
  SemanticValidationOutput,
  RouteClassificationOutput,
  RouteDocType,
  RouteSecurityFlag,
  StructuredPayloadOutput,
  ExecutiveInsightsOutput,
  Audience,
  Tone,
  AlertLevel,
} from "./types";

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

function fallbackSemanticValidation(input: {
  ocrJson: unknown;
  extractionText: string;
}): SemanticValidationOutput {
  const hasText = Boolean(input.extractionText.trim());

  return {
    is_valid: hasText,
    confidence_overall: hasText ? 0.45 : 0,
    normalized: {
      currency: "BRL",
      transactions: [],
    },
    issues: [
      ...(hasText ? [] : [{ code: "MISSING_FIELD", message: "Texto OCR ausente" }]),
      { code: "SEMANTIC_FALLBACK", message: "Validação semântica executada em modo fallback" },
      ...(input.ocrJson ? [] : [{ code: "MISSING_FIELD", message: "ocr_json ausente" }]),
    ],
    needs_human_review: true,
  };
}

function coerceSemanticValidation(value: unknown): SemanticValidationOutput {
  if (!value || typeof value !== "object") {
    return fallbackSemanticValidation({ ocrJson: null, extractionText: "" });
  }

  const payload = value as {
    is_valid?: unknown;
    confidence_overall?: unknown;
    normalized?: {
      bank_name?: unknown;
      account_last4?: unknown;
      currency?: unknown;
      period_start?: unknown;
      period_end?: unknown;
      opening_balance?: unknown;
      closing_balance?: unknown;
      transactions?: unknown;
    };
    issues?: unknown;
    needs_human_review?: unknown;
  };

  const transactions = Array.isArray(payload.normalized?.transactions)
    ? payload.normalized!.transactions
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          date: typeof item.date === "string" ? item.date : "",
          description: typeof item.description === "string" ? item.description : "",
          amount: typeof item.amount === "number" ? item.amount : 0,
          type: (item.type === "CREDIT" ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
          category_guess: typeof item.category_guess === "string" ? item.category_guess : null,
          confidence:
            typeof item.confidence === "number"
              ? Math.max(0, Math.min(1, item.confidence))
              : 0,
        }))
        .filter((item) => item.date && item.description)
    : [];

  const issues = Array.isArray(payload.issues)
    ? payload.issues
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          code: typeof item.code === "string" ? item.code : "UNKNOWN_ISSUE",
          message: typeof item.message === "string" ? item.message : undefined,
        }))
    : [];

  return {
    is_valid: Boolean(payload.is_valid),
    confidence_overall:
      typeof payload.confidence_overall === "number"
        ? Math.max(0, Math.min(1, payload.confidence_overall))
        : 0,
    normalized: {
      bank_name:
        typeof payload.normalized?.bank_name === "string" ? payload.normalized.bank_name : undefined,
      account_last4:
        typeof payload.normalized?.account_last4 === "string"
          ? payload.normalized.account_last4
          : undefined,
      currency:
        typeof payload.normalized?.currency === "string" ? payload.normalized.currency : "BRL",
      period_start:
        typeof payload.normalized?.period_start === "string"
          ? payload.normalized.period_start
          : undefined,
      period_end:
        typeof payload.normalized?.period_end === "string" ? payload.normalized.period_end : undefined,
      opening_balance:
        typeof payload.normalized?.opening_balance === "number"
          ? payload.normalized.opening_balance
          : undefined,
      closing_balance:
        typeof payload.normalized?.closing_balance === "number"
          ? payload.normalized.closing_balance
          : undefined,
      transactions,
    },
    issues,
    needs_human_review: Boolean(payload.needs_human_review),
  };
}

function hasSensitiveSignals(text: string): RouteSecurityFlag[] {
  const lower = text.toLowerCase();
  const flags: RouteSecurityFlag[] = [];

  if (/senha|password|private key|chave privada|seed phrase/.test(lower)) {
    flags.push("SUSPECTED_CREDENTIALS");
  }

  if (/cpf|cnpj|rg\b|cart[aã]o|n[uú]mero do cart[aã]o/.test(lower)) {
    flags.push("PII_DETECTED");
  }

  return flags.length > 0 ? flags : ["NONE"];
}

function fallbackRouteClassification(input: {
  text: string;
  fileName: string;
}): RouteClassificationOutput {
  const text = input.text.toLowerCase();
  const fileName = input.fileName.toLowerCase();
  const combined = `${fileName} ${text}`;

  const rejectSignals = ["capa", "cover", "publicidade", "anúncio", "lorem ipsum"];
  const isBlankLike = combined.trim().length < 20;
  if (isBlankLike || rejectSignals.some((signal) => combined.includes(signal))) {
    return {
      doc_type: "REJECT",
      confidence: 0.9,
      reasons: ["Documento irrelevante ou sem conteúdo financeiro útil"],
      route: "skip",
      security_flags: hasSensitiveSignals(combined),
    };
  }

  const candidates: Array<{ type: RouteDocType; route: string; terms: string[]; confidence: number }> = [
    {
      type: "BANK_STATEMENT",
      route: "extract_bank_statement",
      terms: ["extrato", "saldo", "lançamento", "saldo anterior", "saldo final"],
      confidence: 0.72,
    },
    {
      type: "BOLETO",
      route: "extract_boleto",
      terms: ["linha digitável", "boleto", "vencimento"],
      confidence: 0.72,
    },
    {
      type: "INVOICE",
      route: "extract_invoice",
      terms: ["nota fiscal", "nfe", "danfe", "fatura"],
      confidence: 0.68,
    },
    {
      type: "RECEIPT",
      route: "extract_receipt",
      terms: ["recibo", "comprovante"],
      confidence: 0.66,
    },
    {
      type: "CONTRACT",
      route: "extract_contract",
      terms: ["contrato", "cláusula", "assinatura"],
      confidence: 0.64,
    },
  ];

  const found = candidates.find((item) => item.terms.some((term) => combined.includes(term)));

  if (!found) {
    return {
      doc_type: "OTHER",
      confidence: 0.4,
      reasons: ["Sem evidência suficiente para tipo específico"],
      route: "extract_other",
      security_flags: hasSensitiveSignals(combined),
    };
  }

  return {
    doc_type: found.type,
    confidence: found.confidence,
    reasons: ["Classificação por heurística de termos-chave"],
    route: found.route,
    security_flags: hasSensitiveSignals(combined),
  };
}

function coerceRouteClassification(value: unknown, fallback: RouteClassificationOutput): RouteClassificationOutput {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const payload = value as {
    doc_type?: unknown;
    confidence?: unknown;
    reasons?: unknown;
    route?: unknown;
    security_flags?: unknown;
  };

  const allowedDocTypes: RouteDocType[] = [
    "BANK_STATEMENT",
    "INVOICE",
    "BOLETO",
    "RECEIPT",
    "CONTRACT",
    "OTHER",
    "REJECT",
  ];

  const docType =
    typeof payload.doc_type === "string" &&
    allowedDocTypes.includes(payload.doc_type as RouteDocType)
      ? (payload.doc_type as RouteDocType)
      : fallback.doc_type;

  const securityFlags = Array.isArray(payload.security_flags)
    ? payload.security_flags
        .filter((item): item is RouteSecurityFlag =>
          item === "PII_DETECTED" || item === "SUSPECTED_CREDENTIALS" || item === "NONE"
        )
    : fallback.security_flags;

  return {
    doc_type: docType,
    confidence:
      typeof payload.confidence === "number"
        ? Math.max(0, Math.min(1, payload.confidence))
        : fallback.confidence,
    reasons: Array.isArray(payload.reasons)
      ? payload.reasons.filter((item): item is string => typeof item === "string")
      : fallback.reasons,
    route:
      typeof payload.route === "string" && payload.route.trim().length > 0
        ? payload.route
        : fallback.route,
    security_flags: securityFlags.length > 0 ? securityFlags : ["NONE"],
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

export async function validateSemanticPostOcr(input: {
  ocrJson: unknown;
  documentMeta?: Record<string, unknown>;
  extractionText: string;
}): Promise<{ semanticValidation: SemanticValidationOutput; errors: string[] }> {
  if (!hasAzureOpenAIConfig()) {
    return {
      semanticValidation: fallbackSemanticValidation({
        ocrJson: input.ocrJson,
        extractionText: input.extractionText,
      }),
      errors: ["azure_openai_not_configured_semantic_validation"],
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const prompt = semanticValidationPrompt.prompt_template
    .replace("{{ocr_json}}", JSON.stringify(input.ocrJson ?? {}, null, 2))
    .replace("{{document_meta}}", JSON.stringify(input.documentMeta ?? {}, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        temperature: semanticValidationPrompt.parameters.temperature,
        top_p: semanticValidationPrompt.parameters.top_p,
        max_tokens: semanticValidationPrompt.parameters.max_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        semanticValidation: fallbackSemanticValidation({
          ocrJson: input.ocrJson,
          extractionText: input.extractionText,
        }),
        errors: [`semantic_validation_error: ${detail}`],
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return {
        semanticValidation: fallbackSemanticValidation({
          ocrJson: input.ocrJson,
          extractionText: input.extractionText,
        }),
        errors: ["semantic_validation_empty_response"],
      };
    }

    const parsed = JSON.parse(content) as unknown;
    return {
      semanticValidation: coerceSemanticValidation(parsed),
      errors: [],
    };
  } catch (error) {
    return {
      semanticValidation: fallbackSemanticValidation({
        ocrJson: input.ocrJson,
        extractionText: input.extractionText,
      }),
      errors: [
        error instanceof Error
          ? `semantic_validation_exception: ${error.message}`
          : "semantic_validation_exception",
      ],
    };
  }
}

export async function classifyDocumentRoute(input: {
  ocrJson: unknown;
  fileMeta: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  };
  extractionText: string;
}): Promise<{ routeClassification: RouteClassificationOutput; errors: string[] }> {
  const fallback = fallbackRouteClassification({
    text: input.extractionText,
    fileName: input.fileMeta.fileName,
  });

  if (!hasAzureOpenAIConfig()) {
    return {
      routeClassification: fallback,
      errors: ["azure_openai_not_configured_route_classification"],
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const prompt = routeClassificationPrompt.prompt_template
    .replace("{{ocr_json}}", JSON.stringify(input.ocrJson ?? {}, null, 2))
    .replace("{{file_meta}}", JSON.stringify(input.fileMeta, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        temperature: routeClassificationPrompt.parameters.temperature,
        top_p: routeClassificationPrompt.parameters.top_p,
        max_tokens: routeClassificationPrompt.parameters.max_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        routeClassification: fallback,
        errors: [`route_classification_error: ${detail}`],
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return {
        routeClassification: fallback,
        errors: ["route_classification_empty_response"],
      };
    }

    const parsed = JSON.parse(content) as unknown;
    return {
      routeClassification: coerceRouteClassification(parsed, fallback),
      errors: [],
    };
  } catch (error) {
    return {
      routeClassification: fallback,
      errors: [
        error instanceof Error
          ? `route_classification_exception: ${error.message}`
          : "route_classification_exception",
      ],
    };
  }
}

function normalizeCategory(value: string | undefined): string {
  const v = (value || "").toUpperCase();
  if (v.includes("RECEITA")) return "RECEITAS";
  if (v.includes("DESPESA")) return "DESPESAS";
  if (v.includes("TARIFA")) return "TARIFAS";
  if (v.includes("IMPOST")) return "IMPOSTOS";
  if (v.includes("TRANSFER")) return "TRANSFERENCIAS";
  return "OUTROS";
}

function fallbackStructuredPayload(input: {
  validatedDoc: SemanticValidationOutput;
  tenantContext: { companyId: string; timezone?: string; currency_default?: string };
  fileMeta: { originalFilename: string; sourceUri?: string; sourceDocId: string };
}): StructuredPayloadOutput {
  const companyId = input.tenantContext.companyId;
  const currency = input.validatedDoc.normalized.currency || input.tenantContext.currency_default || "BRL";
  const bankName = input.validatedDoc.normalized.bank_name || "";
  const last4 = input.validatedDoc.normalized.account_last4 || "";
  const externalRef = `${bankName || "bank"}_${last4 || "0000"}`;

  const transactions = input.validatedDoc.normalized.transactions.map((tx) => ({
    accountRef: externalRef,
    date: tx.date,
    description: tx.description,
    amount: tx.type === "DEBIT" ? -Math.abs(tx.amount) : Math.abs(tx.amount),
    type: tx.type,
    category: normalizeCategory(tx.category_guess || undefined),
    sourceDocId: input.fileMeta.sourceDocId,
  }));

  return {
    companyId,
    accounts: [
      {
        externalRef,
        bankName: bankName || undefined,
        last4: last4 || undefined,
        currency,
      },
    ],
    transactions,
    document: {
      source: input.fileMeta.sourceUri || "",
      originalFilename: input.fileMeta.originalFilename,
      period_start: input.validatedDoc.normalized.period_start,
      period_end: input.validatedDoc.normalized.period_end,
      closing_balance: input.validatedDoc.normalized.closing_balance,
      issues: input.validatedDoc.issues.map((issue) => issue.code),
      accuracyScore: input.validatedDoc.confidence_overall,
    },
  };
}

function coerceStructuredPayload(
  value: unknown,
  fallback: StructuredPayloadOutput
): StructuredPayloadOutput {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const payload = value as {
    companyId?: unknown;
    accounts?: unknown;
    transactions?: unknown;
    document?: unknown;
  };

  const accounts = Array.isArray(payload.accounts)
    ? payload.accounts
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          externalRef:
            typeof item.externalRef === "string" && item.externalRef.trim().length > 0
              ? item.externalRef
              : fallback.accounts[0]?.externalRef || "bank_0000",
          bankName: typeof item.bankName === "string" ? item.bankName : undefined,
          last4: typeof item.last4 === "string" ? item.last4 : undefined,
          currency: typeof item.currency === "string" ? item.currency : "BRL",
        }))
    : fallback.accounts;

  const accountRefs = new Set(accounts.map((account) => account.externalRef));
  const defaultRef = accounts[0]?.externalRef || "bank_0000";

  const transactions = Array.isArray(payload.transactions)
    ? payload.transactions
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => {
          const type = (item.type === "CREDIT" ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT";
          const rawAmount = typeof item.amount === "number" ? item.amount : 0;
          return {
            accountRef:
              typeof item.accountRef === "string" && accountRefs.has(item.accountRef)
                ? item.accountRef
                : defaultRef,
            date: typeof item.date === "string" ? item.date : "",
            description: typeof item.description === "string" ? item.description : "",
            amount: type === "DEBIT" ? -Math.abs(rawAmount) : Math.abs(rawAmount),
            type,
            category:
              typeof item.category === "string"
                ? normalizeCategory(item.category)
                : "OUTROS",
            sourceDocId:
              typeof item.sourceDocId === "string"
                ? item.sourceDocId
                : fallback.document.originalFilename,
          };
        })
        .filter((tx) => tx.date && tx.description)
    : fallback.transactions;

  const document =
    payload.document && typeof payload.document === "object"
      ? (payload.document as Record<string, unknown>)
      : {};

  return {
    companyId:
      typeof payload.companyId === "string" && payload.companyId.trim().length > 0
        ? payload.companyId
        : fallback.companyId,
    accounts: accounts.length > 0 ? accounts : fallback.accounts,
    transactions,
    document: {
      source: typeof document.source === "string" ? document.source : fallback.document.source,
      originalFilename:
        typeof document.originalFilename === "string"
          ? document.originalFilename
          : fallback.document.originalFilename,
      period_start:
        typeof document.period_start === "string" ? document.period_start : fallback.document.period_start,
      period_end: typeof document.period_end === "string" ? document.period_end : fallback.document.period_end,
      closing_balance:
        typeof document.closing_balance === "number"
          ? document.closing_balance
          : fallback.document.closing_balance,
      issues: Array.isArray(document.issues)
        ? document.issues.filter((item): item is string => typeof item === "string")
        : fallback.document.issues,
      accuracyScore:
        typeof document.accuracyScore === "number"
          ? Math.max(0, Math.min(1, document.accuracyScore))
          : fallback.document.accuracyScore,
    },
  };
}

export async function buildStructuredPayload(input: {
  validatedDoc: SemanticValidationOutput;
  tenantContext: { companyId: string; timezone?: string; currency_default?: string };
  fileMeta: { originalFilename: string; sourceUri?: string; sourceDocId: string };
}): Promise<{ persistencePayload: StructuredPayloadOutput; errors: string[] }> {
  const fallback = fallbackStructuredPayload(input);

  if (!hasAzureOpenAIConfig()) {
    return {
      persistencePayload: fallback,
      errors: ["azure_openai_not_configured_structured_payload"],
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const prompt = structuredSchemaPrompt.prompt_template
    .replace("{{validated_doc}}", JSON.stringify(input.validatedDoc, null, 2))
    .replace("{{tenant_context}}", JSON.stringify(input.tenantContext, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        temperature: structuredSchemaPrompt.parameters.temperature,
        top_p: structuredSchemaPrompt.parameters.top_p,
        max_tokens: structuredSchemaPrompt.parameters.max_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        persistencePayload: fallback,
        errors: [`structured_payload_error: ${detail}`],
      };
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      return {
        persistencePayload: fallback,
        errors: ["structured_payload_empty_response"],
      };
    }

    const parsed = JSON.parse(content) as unknown;
    return {
      persistencePayload: coerceStructuredPayload(parsed, fallback),
      errors: [],
    };
  } catch (error) {
    return {
      persistencePayload: fallback,
      errors: [
        error instanceof Error
          ? `structured_payload_exception: ${error.message}`
          : "structured_payload_exception",
      ],
    };
  }
}

function fallbackExecutiveInsights(kpis: unknown): ExecutiveInsightsOutput {
  return {
    headline: "Resumo executivo indisponível",
    summary:
      "Não foi possível gerar insights executivos automaticamente. Revise manualmente os KPIs consolidados.",
    key_points: [
      "Serviço de AI indisponível no momento",
      "KPIs podem ser consultados diretamente no dashboard",
    ],
    alerts: [
      {
        level: "MEDIUM",
        message: "Sistema de insights operando em modo fallback",
        recommended_action: "Verifique configuração do Azure OpenAI",
      },
    ],
    one_week_outlook: "Projeção não disponível. Consulte analista financeiro.",
  };
}

function coerceExecutiveInsights(value: unknown): ExecutiveInsightsOutput {
  if (!value || typeof value !== "object") {
    return fallbackExecutiveInsights(null);
  }

  const payload = value as {
    headline?: unknown;
    summary?: unknown;
    key_points?: unknown;
    alerts?: unknown;
    one_week_outlook?: unknown;
  };

  const headline =
    typeof payload.headline === "string" ? payload.headline : "Resumo executivo";
  const summary =
    typeof payload.summary === "string" ? payload.summary : "Informações não disponíveis.";

  let key_points: string[] = [];
  if (Array.isArray(payload.key_points)) {
    key_points = payload.key_points
      .filter((item) => typeof item === "string")
      .map((item) => String(item));
  }
  if (key_points.length === 0) {
    key_points = ["Pontos-chave não puderam ser extraídos"];
  }

  let alerts: ExecutiveInsightsOutput["alerts"] = [];
  if (Array.isArray(payload.alerts)) {
    alerts = payload.alerts
      .filter((item): item is { level?: unknown; message?: unknown; recommended_action?: unknown } =>
        Boolean(item && typeof item === "object")
      )
      .map((alert) => {
        const level = ["HIGH", "MEDIUM", "LOW"].includes(String(alert.level).toUpperCase())
          ? (String(alert.level).toUpperCase() as AlertLevel)
          : "MEDIUM";
        const message =
          typeof alert.message === "string" ? alert.message : "Alerta sem descrição";
        const recommended_action =
          typeof alert.recommended_action === "string" ? alert.recommended_action : undefined;
        return { level, message, recommended_action };
      });
  }

  const one_week_outlook =
    typeof payload.one_week_outlook === "string" ? payload.one_week_outlook : undefined;

  return {
    headline,
    summary,
    key_points,
    alerts,
    one_week_outlook,
  };
}

export async function generateExecutiveInsights(input: {
  kpis: Record<string, unknown>;
  audience: Audience;
  tone: Tone;
}): Promise<{ insights: ExecutiveInsightsOutput; errors: string[] }> {
  if (!hasAzureOpenAIConfig()) {
    return {
      insights: fallbackExecutiveInsights(input.kpis),
      errors: ["azure_openai_not_configured"],
    };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const prompt = executiveInsightsPrompt.prompt_template
    .replace("{{kpis}}", JSON.stringify(input.kpis, null, 2))
    .replace("{{audience}}", input.audience)
    .replace("{{tone}}", input.tone);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        temperature: executiveInsightsPrompt.parameters.temperature,
        top_p: executiveInsightsPrompt.parameters.top_p,
        max_tokens: executiveInsightsPrompt.parameters.max_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        insights: fallbackExecutiveInsights(input.kpis),
        errors: [`executive_insights_error: ${detail}`],
      };
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      return {
        insights: fallbackExecutiveInsights(input.kpis),
        errors: ["executive_insights_empty_response"],
      };
    }

    const parsed = JSON.parse(content) as unknown;
    return {
      insights: coerceExecutiveInsights(parsed),
      errors: [],
    };
  } catch (error) {
    return {
      insights: fallbackExecutiveInsights(input.kpis),
      errors: [
        error instanceof Error
          ? `executive_insights_exception: ${error.message}`
          : "executive_insights_exception",
      ],
    };
  }
}
