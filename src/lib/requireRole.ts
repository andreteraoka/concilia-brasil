import { apiError } from "@/src/lib/apiResponse";
import { getRequestContext, Role } from "@/src/lib/request-context";

type RoleInput = Role | Role[];

export async function requireRole(role: RoleInput) {
  const context = await getRequestContext();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(context.role)) {
    return {
      ok: false as const,
      response: apiError("Acesso negado", 403),
    };
  }

  return {
    ok: true as const,
    context,
  };
}
