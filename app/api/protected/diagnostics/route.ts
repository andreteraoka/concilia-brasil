import { apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) {
    return auth.response;
  }

  return apiOk({
    status: "ok",
    diagnostics: {
      userId: auth.context.userId,
      companyId: auth.context.companyId,
      role: auth.context.role,
      timestamp: new Date().toISOString(),
    },
  });
}
