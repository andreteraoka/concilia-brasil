import { prisma } from "@/src/lib/prisma";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async createCompanyWithAdmin(data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    cnpj: string;
  }) {
    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        cnpj: data.cnpj,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    return { company, user };
  },
};
