import { apiCreated, apiError, apiOk } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { documentService } from "@/src/modules/documents/services/documentService";

export async function GET() {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;
    const data = await documentService.list(companyId);
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
    const data = await documentService.create({
      fileName: body.fileName,
      fileType: body.fileType,
      status: body.status,
      companyId,
    });
    return apiCreated(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
