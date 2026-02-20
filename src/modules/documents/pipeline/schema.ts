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
