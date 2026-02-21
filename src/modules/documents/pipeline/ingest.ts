import { readFile, writeFile } from "fs/promises";
import path from "path";
import {
  analyzeWithAI,
  buildStructuredPayload,
  classifyDocumentRoute,
  validateSemanticPostOcr,
} from "./ai";
import { uploadArtifacts } from "./blob";
import { extractDocument } from "./extractor";
import { validateOutput } from "./schema";
import { PipelineOutput } from "./types";
import {
  detectMimeType,
  ensureDirectoryWithGitkeep,
  listFilesRecursive,
  nowIso,
  runWithConcurrency,
  sanitizeFileName,
  sha256Hex,
} from "./utils";

export type IngestOptions = {
  input: string;
  output: string;
  upload: boolean;
  uploadOriginal: boolean;
  maxFiles?: number;
  concurrency: number;
  quiet?: boolean;
};

const defaultOptions: IngestOptions = {
  input: "./input",
  output: "./output",
  upload: false,
  uploadOriginal: false,
  concurrency: 2,
  quiet: false,
};

function log(enabled: boolean, message: string) {
  if (!enabled) {
    return;
  }

  console.log(message);
}

function createBaseOutput(input: {
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}): PipelineOutput {
  return {
    id: input.sha256,
    source: {
      path: input.filePath,
      filename: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
    },
    extraction: {
      method: "fallback",
      text: "",
      pages: null,
    },
    classification: {
      documentType: "OUTRO",
      confidence: 0,
      summary: "",
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
      confidence_overall: 0,
      normalized: {
        currency: "BRL",
        transactions: [],
      },
      issues: [],
      needs_human_review: true,
    },
    routeClassification: {
      doc_type: "OTHER",
      confidence: 0,
      reasons: [],
      route: "extract_other",
      security_flags: ["NONE"],
    },
    persistencePayload: {
      companyId: "unknown-company",
      accounts: [],
      transactions: [],
      document: {
        source: "",
        originalFilename: input.fileName,
      },
    },
    azure: {
      blobJsonUrl: null,
      blobOriginalUrl: null,
    },
    errors: [],
    timestamps: {
      processedAt: nowIso(),
    },
  };
}

async function processFile(filePath: string, options: IngestOptions) {
  const fileBuffer = await readFile(filePath);
  const fileName = path.basename(filePath);
  const safeName = sanitizeFileName(fileName);
  const sha256 = sha256Hex(fileBuffer);
  const mimeType = detectMimeType(filePath);

  const baseOutput = createBaseOutput({
    filePath,
    fileName,
    mimeType,
    sizeBytes: fileBuffer.length,
    sha256,
  });

  const extraction = await extractDocument(filePath);
  baseOutput.extraction = {
    method: extraction.method,
    text: extraction.text,
    pages: extraction.pages,
  };
  baseOutput.errors.push(...extraction.errors);

  const ai = await analyzeWithAI(extraction.text);
  baseOutput.classification = ai.classification;
  baseOutput.fields = ai.fields;
  baseOutput.errors.push(...ai.errors);

  const semantic = await validateSemanticPostOcr({
    ocrJson: {
      method: extraction.method,
      text: extraction.text,
      pages: extraction.pages,
    },
    documentMeta: {
      fileName,
      mimeType,
      sha256,
    },
    extractionText: extraction.text,
  });

  baseOutput.semanticValidation = semantic.semanticValidation;
  baseOutput.errors.push(...semantic.errors);

  const route = await classifyDocumentRoute({
    ocrJson: {
      method: extraction.method,
      text: extraction.text,
      pages: extraction.pages,
    },
    fileMeta: {
      fileName,
      mimeType,
      sizeBytes: fileBuffer.length,
      sha256,
    },
    extractionText: extraction.text,
  });

  baseOutput.routeClassification = route.routeClassification;
  baseOutput.errors.push(...route.errors);

  if (route.routeClassification.doc_type === "REJECT" || route.routeClassification.route === "skip") {
    baseOutput.errors.push("route_skip_requested");
  }

  const structured = await buildStructuredPayload({
    validatedDoc: semantic.semanticValidation,
    tenantContext: {
      companyId: process.env.INGEST_DEFAULT_COMPANY_ID || "unknown-company",
      timezone: process.env.INGEST_DEFAULT_TIMEZONE || "America/Sao_Paulo",
      currency_default: process.env.INGEST_DEFAULT_CURRENCY || "BRL",
    },
    fileMeta: {
      originalFilename: fileName,
      sourceUri: baseOutput.azure.blobOriginalUrl || "",
      sourceDocId: sha256,
    },
  });

  baseOutput.persistencePayload = structured.persistencePayload;
  baseOutput.errors.push(...structured.errors);

  const outputFilePath = path.resolve(options.output, `${sha256}_${safeName}.json`);
  baseOutput.timestamps.processedAt = nowIso();

  const validated = validateOutput(baseOutput);
  await writeFile(outputFilePath, JSON.stringify(validated, null, 2), "utf-8");

  const uploadResult = await uploadArtifacts({
    upload: options.upload,
    uploadOriginal: options.uploadOriginal,
    sha256,
    outputJsonPath: outputFilePath,
    originalFilePath: filePath,
  });

  if (uploadResult.blobJsonUrl || uploadResult.blobOriginalUrl || uploadResult.errors.length > 0) {
    validated.azure.blobJsonUrl = uploadResult.blobJsonUrl;
    validated.azure.blobOriginalUrl = uploadResult.blobOriginalUrl;
    validated.errors.push(...uploadResult.errors);
    await writeFile(outputFilePath, JSON.stringify(validated, null, 2), "utf-8");
  }

  return { outputFilePath, id: sha256, errors: validated.errors };
}

export async function runIngestPipeline(rawOptions?: Partial<IngestOptions>) {
  const options: IngestOptions = {
    ...defaultOptions,
    ...rawOptions,
  };

  const inputDir = path.resolve(options.input);
  const outputDir = path.resolve(options.output);

  await ensureDirectoryWithGitkeep(inputDir);
  await ensureDirectoryWithGitkeep(outputDir);

  const discovered = await listFilesRecursive(inputDir);
  const files = discovered.filter((filePath) => !filePath.endsWith(".gitkeep"));
  const selectedFiles =
    typeof options.maxFiles === "number" ? files.slice(0, options.maxFiles) : files;

  log(!options.quiet, `[ingest] arquivos encontrados: ${selectedFiles.length}`);

  const summary = {
    total: selectedFiles.length,
    success: 0,
    failed: 0,
    outputs: [] as string[],
  };

  await runWithConcurrency(
    selectedFiles,
    async (filePath) => {
      try {
        const result = await processFile(filePath, options);
        summary.success += 1;
        summary.outputs.push(result.outputFilePath);
        log(!options.quiet, `[ok] ${path.basename(filePath)} -> ${path.basename(result.outputFilePath)}`);
      } catch (error) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : "unknown_error";
        log(!options.quiet, `[erro] ${path.basename(filePath)} -> ${message}`);
      }
    },
    options.concurrency
  );

  log(
    !options.quiet,
    `[ingest] concluído | total=${summary.total} success=${summary.success} failed=${summary.failed}`
  );

  return summary;
}
