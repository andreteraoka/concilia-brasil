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
  azure: {
    blobJsonUrl: string | null;
    blobOriginalUrl: string | null;
  };
  errors: string[];
  timestamps: {
    processedAt: string;
  };
};
