import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { logger } from "@/lib/logger";
import { StorageProvider, UploadInput, UploadResult } from "./StorageProvider";

export class LocalStorageProvider implements StorageProvider {
  private readonly storageRoot: string;
  private readonly publicBaseUrl: string;

  constructor(options?: { storageRoot?: string; publicBaseUrl?: string }) {
    this.storageRoot =
      options?.storageRoot || path.join(process.cwd(), "public", "uploads");
    this.publicBaseUrl = options?.publicBaseUrl || "/uploads";
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${randomUUID()}-${safeName}`;
    const relativePath = path.posix.join(input.companyId, fileName);
    const absolutePath = path.join(this.storageRoot, input.companyId, fileName);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    const result: UploadResult = {
      provider: "local",
      filePath: relativePath,
      publicUrl: `${this.publicBaseUrl}/${relativePath}`,
    };

    logger.documentInfo("File uploaded to local storage", {
      companyId: input.companyId,
      fileName: input.fileName,
      filePath: result.filePath,
    });

    return result;
  }

  async remove(filePath: string): Promise<void> {
    const absolutePath = path.join(this.storageRoot, filePath);
    await rm(absolutePath, { force: true });

    logger.documentInfo("File removed from local storage", { filePath });
  }
}
