import { apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { accountService } from "@/src/modules/accounts/services/accountService";
import { handleApiError, NotFoundError, ValidationError } from "@/src/lib/errorHandler";
import { validateRequest } from "@/src/lib/validation";
import { updateAccountSchema } from "@/src/lib/validationSchemas";
import type { UpdateAccountInput } from "@/src/lib/validationSchemas";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const { id } = params;

    const account = await accountService.getById(id, companyId);
    if (!account) {
      throw new NotFoundError("Conta não encontrada");
    }

    logger.info("Account retrieved", { companyId, accountId: id });
    return apiOk(account);
  } catch (error) {
    logger.error("Failed to retrieve account", error);
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const { id } = params;
    
    const body = await validateRequest<UpdateAccountInput>(req, updateAccountSchema);

    // Verify account exists and belongs to company
    const account = await accountService.getById(id, companyId);
    if (!account) {
      throw new NotFoundError("Conta não encontrada");
    }

    const result = await accountService.update(id, companyId, {
      bankName: body.bankName,
      agency: body.agency,
      accountNumber: body.accountNumber,
      type: body.type,
    });

    if (result.count === 0) {
      throw new ValidationError("Falha ao atualizar conta");
    }

    logger.info("Account updated", { companyId, accountId: id });
    return apiOk({ success: true, message: "Conta atualizada com sucesso" });
  } catch (error) {
    logger.error("Failed to update account", error);
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const { id } = params;

    // Verify account exists and belongs to company
    const account = await accountService.getById(id, companyId);
    if (!account) {
      throw new NotFoundError("Conta não encontrada");
    }

    const result = await accountService.delete(id, companyId);

    if (result.count === 0) {
      throw new ValidationError("Falha ao deletar conta");
    }

    logger.info("Account deleted", { companyId, accountId: id });
    return apiOk({ success: true, message: "Conta removida com sucesso" });
  } catch (error) {
    logger.error("Failed to delete account", error);
    return handleApiError(error);
  }
}
