import { z } from "zod";
import { DOCUMENT_TYPES, PipelineOutput } from "./types";

export const outputSchema = z.object({
  id: z.string().min(1),
  source: z.object({
    path: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    sha256: z.string().length(64),
  }),
  extraction: z.object({
    method: z.string().min(1),
    text: z.string(),
    pages: z.unknown().nullable(),
  }),
  classification: z.object({
    documentType: z.enum(DOCUMENT_TYPES),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
    tags: z.array(z.string()),
  }),
  fields: z.object({
    issuerName: z.string().nullable(),
    issuerId: z.string().nullable(),
    customerName: z.string().nullable(),
    customerId: z.string().nullable(),
    documentNumber: z.string().nullable(),
    bankName: z.string().nullable(),
    accountLast4: z.string().nullable(),
    issueDate: z.string().nullable(),
    dueDate: z.string().nullable(),
    periodStart: z.string().nullable(),
    periodEnd: z.string().nullable(),
    totalAmount: z.number().nullable(),
    currency: z.literal("BRL"),
    barcode: z.string().nullable(),
    pixKey: z.string().nullable(),
    nfAccessKey: z.string().nullable(),
  }),
  semanticValidation: z.object({
    is_valid: z.boolean(),
    confidence_overall: z.number().min(0).max(1),
    normalized: z.object({
      bank_name: z.string().optional(),
      account_last4: z.string().optional(),
      currency: z.string().min(1),
      period_start: z.string().optional(),
      period_end: z.string().optional(),
      opening_balance: z.number().optional(),
      closing_balance: z.number().optional(),
      transactions: z.array(
        z.object({
          date: z.string(),
          description: z.string(),
          amount: z.number(),
          type: z.enum(["CREDIT", "DEBIT"]),
          category_guess: z.string().nullable(),
          confidence: z.number().min(0).max(1),
        })
      ),
    }),
    issues: z.array(
      z.object({
        code: z.string().min(1),
        message: z.string().optional(),
      })
    ),
    needs_human_review: z.boolean(),
  }),
  routeClassification: z.object({
    doc_type: z.enum([
      "BANK_STATEMENT",
      "INVOICE",
      "BOLETO",
      "RECEIPT",
      "CONTRACT",
      "OTHER",
      "REJECT",
    ]),
    confidence: z.number().min(0).max(1),
    reasons: z.array(z.string()),
    route: z.string().min(1),
    security_flags: z.array(z.enum(["PII_DETECTED", "SUSPECTED_CREDENTIALS", "NONE"])),
  }),
  azure: z.object({
    blobJsonUrl: z.string().nullable(),
    blobOriginalUrl: z.string().nullable(),
  }),
  errors: z.array(z.string()),
  timestamps: z.object({
    processedAt: z.string().datetime(),
  }),
});

export function validateOutput(payload: PipelineOutput): PipelineOutput {
  return outputSchema.parse(payload) as PipelineOutput;
}
