import { apiError, apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { financialService } from "@/src/modules/financial/services/financial.service";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "12");

    const data = await financialService.getMonthlyRevenueVsExpense(
      companyId,
      months
    );
    return apiOk(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
