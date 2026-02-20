import { describe, expect, it } from "vitest";
import { validateOutput } from "./schema";
import { PipelineOutput } from "./types";

describe("pipeline schema", () => {
  it("valida payload mínimo obrigatório", () => {
    const payload: PipelineOutput = {
      id: "a".repeat(64),
      source: {
        path: "./input/file.txt",
        filename: "file.txt",
        mimeType: "text/plain",
        sizeBytes: 10,
        sha256: "a".repeat(64),
      },
      extraction: {
        method: "fallback",
        text: "abc",
        pages: null,
      },
      classification: {
        documentType: "OUTRO",
        confidence: 0.2,
        summary: "resumo",
        tags: [],
      },
      fields: {
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
      },
      semanticValidation: {
        is_valid: false,
        confidence_overall: 0.2,
        normalized: {
          currency: "BRL",
          transactions: [],
        },
        issues: [{ code: "MISSING_FIELD" }],
        needs_human_review: true,
      },
      azure: {
        blobJsonUrl: null,
        blobOriginalUrl: null,
      },
      errors: [],
      timestamps: {
        processedAt: new Date().toISOString(),
      },
    };

    const parsed = validateOutput(payload);
    expect(parsed.classification.documentType).toBe("OUTRO");
    expect(parsed.fields.currency).toBe("BRL");
  });
});
