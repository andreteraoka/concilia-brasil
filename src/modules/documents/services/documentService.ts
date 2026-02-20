import { logger } from "@/lib/logger";
import { documentRepository } from "../repositories/documentRepository";

export const documentService = {
  list(companyId: string) {
    return documentRepository.listByCompany(companyId);
  },

  create(input: {
    fileName: string;
    fileType: string;
    companyId: string;
    status?: string;
  }) {
    if (!input.fileName || !input.fileType) {
      throw new Error("Campos obrigatórios faltando");
    }

    return documentRepository.create(input);
  },

  async processAsync(payload: { documentId: string; companyId: string; userId: string }) {
    const document = await documentRepository.findById(payload.documentId);
    if (!document || document.companyId !== payload.companyId) {
      throw new Error("Documento não encontrado");
    }

    logger.documentInfo("Document processing started", payload);
    await documentRepository.createProcessingLog({
      stage: "received",
      status: "processing",
      message: "Documento recebido para processamento",
      documentId: payload.documentId,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    await documentRepository.createProcessingLog({
      stage: "completed",
      status: "success",
      message: "Documento processado",
      documentId: payload.documentId,
    });

    logger.documentInfo("Document processing completed", payload);
  },
};
