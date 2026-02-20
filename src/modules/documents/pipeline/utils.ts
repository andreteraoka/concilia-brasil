import { createHash } from "crypto";
import { mkdir, readdir, writeFile } from "fs/promises";
import path from "path";

const mimeByExt: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeByExt[ext] || "application/octet-stream";
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureDirectoryWithGitkeep(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
  const gitkeepPath = path.join(dirPath, ".gitkeep");
  await writeFile(gitkeepPath, "", { flag: "a" });
}

export async function listFilesRecursive(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath);
      }
      return [entryPath];
    })
  );

  return files.flat();
}

export async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number
) {
  const queue = [...items];
  const workers = new Array(Math.max(1, concurrency)).fill(null).map(async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        break;
      }
      await worker(next);
    }
  });

  await Promise.all(workers);
}

export function isTextLikeMime(mimeType: string): boolean {
  return mimeType.startsWith("text/") || mimeType === "application/json";
}

export function nowIso() {
  return new Date().toISOString();
}
