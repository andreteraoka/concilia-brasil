import { apiCreated, apiError, apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { transactionService } from "@/src/modules/transactions/services/transactionService";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const data = await transactionService.list(companyId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type: type || undefined,
      page,
      limit,
    });

    return apiOk(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const body = await req.json();
    const data = await transactionService.create({
      date: body.date ? new Date(body.date) : new Date(),
      description: body.description,
      amount: Number(body.amount),
      type: body.type,
      documentId: body.documentId,
      accountId: body.accountId,
      companyId,
    });
    return apiCreated(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
