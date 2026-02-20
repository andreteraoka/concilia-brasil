import { prisma } from "@/src/lib/prisma";
import bcrypt from "bcryptjs";

export const userRepository = {
  listByCompany(companyId: string) {
    return prisma.user.findMany(
      {
        where: { companyId, status: "active" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }
    );
  },

  getById(id: string, companyId: string) {
    return prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },

  getByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
        createdAt: true,
      },
    });
  },

  async create(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    companyId: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        companyId: data.companyId,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },

  update(
    id: string,
    companyId: string,
    data: {
      name?: string;
      role?: string;
      status?: string;
    }
  ) {
    return prisma.user.updateMany({
      where: { id, companyId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  },
};
