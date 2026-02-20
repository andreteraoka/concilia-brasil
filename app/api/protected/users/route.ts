import { hashPassword } from "@/lib/auth";
import { apiCreated, apiError, apiOk } from "@/src/lib/apiResponse";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/requireRole";

export async function GET() {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;

    const users = await prisma.user.findMany({
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
    });

    return apiOk(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const body = await req.json();

    if (!body.name || !body.email || !body.password || !body.role) {
      return apiError("Campos obrigatórios faltando", 400);
    }

    if (!["ADMIN", "USER"].includes(body.role)) {
      return apiError("Role inválida", 400);
    }

    if (body.password.length < 6) {
      return apiError("Senha deve ter pelo menos 6 caracteres", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existingUser) {
      return apiError("Email já cadastrado", 400);
    }

    const password = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password,
        role: body.role,
        status: "active",
        companyId,
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

    return apiCreated(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
