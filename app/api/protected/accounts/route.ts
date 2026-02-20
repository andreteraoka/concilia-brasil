import { apiCreated, apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { accountService } from "@/src/modules/accounts/services/accountService";
import { handleApiError } from "@/src/lib/errorHandler";
import { validateRequest } from "@/src/lib/validation";
import { createAccountSchema } from "@/src/lib/validationSchemas";
import type { CreateAccountInput } from "@/src/lib/validationSchemas";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    
    const { searchParams } = new URL(request.url);
    const bankFilter = searchParams.get("bank") || undefined;
    
    const data = await accountService.list(companyId, bankFilter);
    logger.info("Accounts listed", { companyId, count: data.length });
    return apiOk(data);
  } catch (error) {
    logger.error("Failed to list accounts", error);
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    
    const body = await validateRequest<CreateAccountInput>(req, createAccountSchema);
    
    const data = await accountService.create({
      bankName: body.bankName,
      agency: body.agency,
      accountNumber: body.accountNumber,
      type: body.type,
      companyId,
    });
    
    logger.info("Account created", { companyId, accountId: data.id });
    return apiCreated(data);
  } catch (error) {
    logger.error("Failed to create account", error);
    return handleApiError(error);
  }
}
