import { apiError, apiOk } from "@/src/lib/apiResponse";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/requireRole";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const { id } = await params;
    const body = await req.json();

    // Verify user exists and belongs to company
    const user = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      return apiError("Usuário não encontrado", 404);
    }

    // Validate role if provided
    if (body.role && !["ADMIN", "USER"].includes(body.role)) {
      return apiError("Role inválido. Deve ser 'ADMIN' ou 'USER'", 400);
    }

    // Validate status if provided
    if (body.status && !["active", "inactive"].includes(body.status)) {
      return apiError("Status inválido. Deve ser 'active' ou 'inactive'", 400);
    }

    const result = await prisma.user.updateMany({
      where: { id, companyId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.role && { role: body.role }),
        ...(body.status && { status: body.status }),
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return apiError("Falha ao atualizar usuário", 400);
    }

    // Return updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return apiOk(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
