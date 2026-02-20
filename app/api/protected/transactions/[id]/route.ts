import { apiError, apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { transactionService } from "@/src/modules/transactions/services/transactionService";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const { id } = await params;

    // Verify transaction exists and belongs to company
    const transaction = await transactionService.getById(id, companyId);
    if (!transaction) {
      return apiError("Transação não encontrada", 404);
    }

    const result = await transactionService.delete(id, companyId);

    if (result.count === 0) {
      return apiError("Falha ao deletar transação", 400);
    }

    return apiOk({ success: true, message: "Transação removida com sucesso" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
