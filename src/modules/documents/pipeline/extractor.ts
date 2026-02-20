import { readFile } from "fs/promises";
import path from "path";
import { detectMimeType, isTextLikeMime } from "./utils";
import { ExtractionOutput } from "./types";

function hasDocumentIntelligenceConfig() {
  return Boolean(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
      (process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY ||
        process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY)
  );
}

async function extractWithDocumentIntelligence(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; pages: unknown | null }> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.replace(/\/$/, "");
  const key =
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY ||
    process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;
  const apiVersion =
    process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION || "2024-11-30";

  if (!endpoint || !key) {
    throw new Error("Document Intelligence credentials not configured");
  }

  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=${apiVersion}`;

  const analyzeResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": mimeType,
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!analyzeResponse.ok) {
    const detail = await analyzeResponse.text();
    throw new Error(`Document Intelligence analyze failed: ${detail}`);
  }

  const operationLocation = analyzeResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Document Intelligence did not return operation-location");
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const pollResponse = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": key,
      },
    });

    if (!pollResponse.ok) {
      const detail = await pollResponse.text();
      throw new Error(`Document Intelligence poll failed: ${detail}`);
    }

    const pollPayload = (await pollResponse.json()) as {
      status?: string;
      analyzeResult?: {
        content?: string;
        pages?: unknown[];
      };
    };

    if (pollPayload.status === "succeeded") {
      return {
        text: pollPayload.analyzeResult?.content || "",
        pages: pollPayload.analyzeResult?.pages || null,
      };
    }

    if (pollPayload.status === "failed") {
      throw new Error("Document Intelligence analysis failed");
    }
  }

  throw new Error("Document Intelligence polling timeout");
}

export async function extractDocument(filePath: string): Promise<ExtractionOutput> {
  const fileBuffer = await readFile(filePath);
  const mimeType = detectMimeType(filePath);

  if (hasDocumentIntelligenceConfig()) {
    try {
      const extracted = await extractWithDocumentIntelligence(fileBuffer, mimeType);
      return {
        method: "document_intelligence",
        text: extracted.text,
        pages: extracted.pages,
        errors: [],
      };
    } catch (error) {
      return {
        method: "fallback",
        text: "",
        pages: null,
        errors: [
          error instanceof Error
            ? `document_intelligence_error: ${error.message}`
            : "document_intelligence_error",
        ],
      };
    }
  }

  if (isTextLikeMime(mimeType)) {
    return {
      method: "fallback",
      text: fileBuffer.toString("utf-8"),
      pages: null,
      errors: ["document_intelligence_not_configured"],
    };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    return {
      method: "fallback",
      text: "",
      pages: null,
      errors: [
        "needs_document_intelligence_configured: local_pdf_extraction_not_available",
      ],
    };
  }

  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return {
      method: "fallback",
      text: "",
      pages: null,
      errors: ["needs_document_intelligence_configured: image_ocr_unavailable"],
    };
  }

  if ([".docx", ".xlsx"].includes(ext)) {
    return {
      method: "fallback",
      text: "",
      pages: null,
      errors: ["unsupported_fallback_format"],
    };
  }

  return {
    method: "fallback",
    text: "",
    pages: null,
    errors: ["unsupported_file_type"],
  };
}
