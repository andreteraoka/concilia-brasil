import { headers } from "next/headers";

export type Role = "ADMIN" | "USER";

export async function getRequestContext() {
  const currentHeaders = await headers();
  const userId = currentHeaders.get("x-user-id");
  const companyId = currentHeaders.get("x-company-id");
  const role = currentHeaders.get("x-user-role") as Role | null;

  if (!userId || !companyId || !role) {
    throw new Error("Missing request auth context");
  }

  return { userId, companyId, role };
}
