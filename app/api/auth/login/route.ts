import { logger } from "@/lib/logger";
import { apiOk } from "@/src/lib/apiResponse";
import { authService } from "@/src/modules/auth/services/authService";
import { handleApiError } from "@/src/lib/errorHandler";
import { validateRequest } from "@/src/lib/validation";
import { loginSchema } from "@/src/lib/validationSchemas";
import type { LoginInput } from "@/src/lib/validationSchemas";

export async function POST(req: Request) {
  try {
    const body = await validateRequest<LoginInput>(req, loginSchema);

    const data = await authService.login({
      email: body.email,
      password: body.password,
    });

    logger.authInfo("User logged in successfully", { userId: data.userId });

    const response = apiOk(data);
    response.cookies.set("token", data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    logger.authError("Login failed", error);
    return handleApiError(error);
  }
}