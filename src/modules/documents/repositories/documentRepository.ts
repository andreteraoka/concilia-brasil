import { prisma } from "@/src/lib/prisma";

export const documentRepository = {
  listByCompany(companyId: string) {
    return prisma.document.findMany({ where: { companyId } });
  },

  findById(id: string) {
    return prisma.document.findUnique({ where: { id } });
  },

  create(data: {
    fileName: string;
    fileType: string;
    companyId: string;
    status?: string;
  }) {
    return prisma.document.create({ data });
  },

  createProcessingLog(data: {
    stage: string;
    status: string;
    message: string;
    documentId?: string;
  }) {
    return prisma.processingLog.create({ data });
  },
};
