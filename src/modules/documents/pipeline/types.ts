export const DOCUMENT_TYPES = [
  "EXTRATO_BANCARIO",
  "RECIBO",
  "CCB",
  "FATURA_CARTAO",
  "FATURA_TELEFONE",
  "NFE",
  "BOLETO",
  "COMPROVANTE_PAGAMENTO",
  "OUTRO",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type ExtractionOutput = {
  method: "document_intelligence" | "fallback";
  text: string;
  pages: unknown | null;
  errors: string[];
};

export type ClassificationOutput = {
  documentType: DocumentType;
  confidence: number;
  summary: string;
  tags: string[];
};

export type FieldsOutput = {
  issuerName: string | null;
  issuerId: string | null;
  customerName: string | null;
  customerId: string | null;
  documentNumber: string | null;
  bankName: string | null;
  accountLast4: string | null;
  issueDate: string | null;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalAmount: number | null;
  currency: "BRL";
  barcode: string | null;
  pixKey: string | null;
  nfAccessKey: string | null;
};

export type SemanticValidationTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category_guess: string | null;
  confidence: number;
};

export type SemanticValidationIssue = {
  code: string;
  message?: string;
};

export type SemanticValidationOutput = {
  is_valid: boolean;
  confidence_overall: number;
  normalized: {
    bank_name?: string;
    account_last4?: string;
    currency: string;
    period_start?: string;
    period_end?: string;
    opening_balance?: number;
    closing_balance?: number;
    transactions: SemanticValidationTransaction[];
  };
  issues: SemanticValidationIssue[];
  needs_human_review: boolean;
};

export type RouteDocType =
  | "BANK_STATEMENT"
  | "INVOICE"
  | "BOLETO"
  | "RECEIPT"
  | "CONTRACT"
  | "OTHER"
  | "REJECT";

export type RouteSecurityFlag = "PII_DETECTED" | "SUSPECTED_CREDENTIALS" | "NONE";

export type RouteClassificationOutput = {
  doc_type: RouteDocType;
  confidence: number;
  reasons: string[];
  route: string;
  security_flags: RouteSecurityFlag[];
};

export type PipelineOutput = {
  id: string;
  source: {
    path: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  };
  extraction: {
    method: string;
    text: string;
    pages: unknown | null | undefined;
  };
  classification: ClassificationOutput;
  fields: FieldsOutput;
  semanticValidation: SemanticValidationOutput;
  routeClassification: RouteClassificationOutput;
  azure: {
    blobJsonUrl: string | null;
    blobOriginalUrl: string | null;
  };
  errors: string[];
  timestamps: {
    processedAt: string;
  };
};
