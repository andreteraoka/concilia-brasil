import { logger } from "@/lib/logger";
import { apiError, apiOk } from "@/src/lib/apiResponse";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/requireRole";
import { companyService } from "@/src/modules/companies/services/companyService";

export async function GET() {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.ok) return auth.response;

    const { companyId } = auth.context;
    const data = await companyService.getMyCompany(companyId);
    return apiOk(data);
  } catch (error) {
    logger.error("Protected companies route failed", error);
    return apiError("Não autorizado", 401);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const company = await prisma.company.update({
      where: { id: auth.context.companyId },
      data: {
        name: body.name,
        cnpj: body.cnpj,
        status: body.status,
      },
    });

    return apiOk({ company });
  } catch (error) {
    logger.error("Protected companies update failed", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}