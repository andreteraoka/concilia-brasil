import { apiOk } from "@/src/lib/apiResponse";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/requireRole";

export async function GET() {
  const auth = await requireRole(["ADMIN", "USER"]);
  if (!auth.ok) {
    return auth.response;
  }

  const [user, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.context.userId },
      select: { name: true, email: true },
    }),
    prisma.company.findUnique({
      where: { id: auth.context.companyId },
      select: { name: true },
    }),
  ]);

  return apiOk({
    userId: auth.context.userId,
    companyId: auth.context.companyId,
    role: auth.context.role,
    userName: user?.name || null,
    userEmail: user?.email || null,
    companyName: company?.name || null,
  });
}
