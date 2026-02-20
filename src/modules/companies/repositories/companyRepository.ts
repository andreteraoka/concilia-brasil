import { prisma } from "@/src/lib/prisma";

export const companyRepository = {
  findById(id: string) {
    return prisma.company.findUnique({ where: { id } });
  },
};
