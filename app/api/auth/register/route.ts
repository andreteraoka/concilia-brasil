import { logger } from "@/lib/logger";
import { apiCreated, apiError, apiInternalError } from "@/src/lib/apiResponse";
import { authService } from "@/src/modules/auth/services/authService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await authService.register({
      name: body.name,
      email: body.email,
      password: body.password,
      companyName: body.companyName,
      cnpj: body.cnpj,
    });

    return apiCreated(data);
  } catch (error) {
    logger.authError("Register route failed", error);
    const message = error instanceof Error ? error.message : undefined;
    if (message === "Campos obrigatórios faltando" || message === "Email já cadastrado") {
      return apiError(message, 400);
    }

    return apiInternalError("Erro interno");
  }
}