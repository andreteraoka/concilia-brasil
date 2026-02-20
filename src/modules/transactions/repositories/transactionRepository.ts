import { prisma } from "@/src/lib/prisma";

export const transactionRepository = {
  async listByCompany(
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (options?.startDate) {
      where.date = { gte: options.startDate };
    }
    if (options?.endDate) {
      if (where.date) {
        (where.date as any).lte = options.endDate;
      } else {
        where.date = { lte: options.endDate };
      }
    }
    if (options?.type) {
      where.type = options.type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { account: true, document: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  getById(id: string, companyId: string) {
    return prisma.transaction.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { account: true, document: true },
    });
  },

  create(data: {
    date: Date;
    description: string;
    amount: number;
    type: string;
    documentId?: string;
    accountId: string;
    companyId: string;
  }) {
    return prisma.transaction.create({ data });
  },

  delete(id: string, companyId: string) {
    // soft delete
    return prisma.transaction.updateMany({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
  },
};
