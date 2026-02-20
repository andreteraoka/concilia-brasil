import { getQueue } from "@/src/lib/queue";
import { documentService } from "../services/documentService";

let initialized = false;

export function registerDocumentQueueHandlers() {
  if (initialized) {
    return;
  }

  const queue = getQueue();
  queue.registerHandler("documents.process", async (job) => {
    const payload = job.payload as {
      documentId: string;
      companyId: string;
      userId: string;
    };

    await documentService.processAsync(payload);
  });

  initialized = true;
}
