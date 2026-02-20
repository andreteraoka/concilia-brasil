import { apiError, apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { financialService } from "@/src/modules/financial/services/financial.service";

export async function GET() {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;

    const summary = await financialService.getDashboardSummary(companyId);
    return apiOk(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
