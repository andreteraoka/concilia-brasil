import { prisma } from "@/src/lib/prisma";

export const accountRepository = {
  listByCompany(companyId: string, bankFilter?: string) {
    return prisma.account.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(bankFilter && { bankName: { contains: bankFilter, mode: "insensitive" } }),
      },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  getById(id: string, companyId: string) {
    return prisma.account.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { transactions: true },
    });
  },

  create(data: {
    bankName: string;
    agency?: string;
    accountNumber: string;
    type: string;
    companyId: string;
  }) {
    return prisma.account.create({ data });
  },

  update(
    id: string,
    companyId: string,
    data: {
      bankName?: string;
      agency?: string;
      accountNumber?: string;
      type?: string;
    }
  ) {
    return prisma.account.updateMany({
      where: { id, companyId, deletedAt: null },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  },

  delete(id: string, companyId: string) {
    // soft delete
    return prisma.account.updateMany({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
  },
};
