import { logger } from "@/lib/logger";
import { apiCreated, apiError } from "@/src/lib/apiResponse";
import { requireRole } from "@/src/lib/requireRole";
import { getQueue } from "@/src/lib/queue";
import { registerDocumentQueueHandlers } from "@/src/modules/documents/queue/registerDocumentQueueHandlers";

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "USER"]);
    if (!auth.ok) return auth.response;

    const { companyId, userId } = auth.context;
    const body = await req.json();

    if (!body.documentId) {
      return apiError("documentId é obrigatório", 400);
    }

    registerDocumentQueueHandlers();
    const queue = getQueue();
    const jobId = await queue.enqueue(
      "documents.process",
      {
        documentId: body.documentId,
        companyId,
        userId,
      },
      { maxAttempts: 3 }
    );

    logger.documentInfo("Document queued", { jobId, documentId: body.documentId, companyId, userId });
    return apiCreated({ jobId, status: "queued" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return apiError(message, 400);
  }
}
