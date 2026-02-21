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
      routeClassification: {
        doc_type: "OTHER",
        confidence: 0.3,
        reasons: ["fallback"],
        route: "extract_other",
        security_flags: ["NONE"],
      },
      persistencePayload: {
        companyId: "company-1",
        accounts: [
          {
            externalRef: "itau_1234",
            bankName: "Itau",
            last4: "1234",
            currency: "BRL",
          },
        ],
        transactions: [
          {
            accountRef: "itau_1234",
            date: "2026-02-20",
            description: "Teste",
            amount: -10,
            type: "DEBIT",
            category: "OUTROS",
            sourceDocId: "doc-1",
          },
        ],
        document: {
          source: "",
          originalFilename: "file.txt",
          period_start: "2026-02-01",
          period_end: "2026-02-20",
          closing_balance: 100,
          issues: [],
          accuracyScore: 0.6,
        },
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
