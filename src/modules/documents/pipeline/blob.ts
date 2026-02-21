import { readFile } from "fs/promises";
import path from "path";
import { BlobServiceClient } from "@azure/storage-blob";
import { createHash } from "crypto";

function hasBlobConfig() {
  return Boolean(
    process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER
  );
}

export async function uploadArtifacts(options: {
  upload: boolean;
  uploadOriginal: boolean;
  sha256: string;
  outputJsonPath: string;
  originalFilePath: string;
}): Promise<{ blobJsonUrl: string | null; blobOriginalUrl: string | null; errors: string[] }> {
  if (!options.upload) {
    return { blobJsonUrl: null, blobOriginalUrl: null, errors: [] };
  }

  if (!hasBlobConfig()) {
    return {
      blobJsonUrl: null,
      blobOriginalUrl: null,
      errors: ["azure_blob_not_configured"],
    };
  }

  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
    const containerName = process.env.AZURE_STORAGE_CONTAINER!;

    const client = BlobServiceClient.fromConnectionString(connectionString);
    const container = client.getContainerClient(containerName);
    await container.createIfNotExists();

    const jsonBuffer = await readFile(options.outputJsonPath);
    const jsonBlobName = `${options.sha256}/${path.basename(options.outputJsonPath)}`;
    const jsonBlob = container.getBlockBlobClient(jsonBlobName);
    await jsonBlob.uploadData(jsonBuffer, {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });

    let blobOriginalUrl: string | null = null;

    if (options.uploadOriginal) {
      const originalBuffer = await readFile(options.originalFilePath);
      const originalBlobName = `${options.sha256}/original_${path.basename(options.originalFilePath)}`;
      const originalBlob = container.getBlockBlobClient(originalBlobName);
      await originalBlob.uploadData(originalBuffer);
      blobOriginalUrl = originalBlob.url;
    }

    return {
      blobJsonUrl: jsonBlob.url,
      blobOriginalUrl,
      errors: [],
    };
  } catch (error) {
    return {
      blobJsonUrl: null,
      blobOriginalUrl: null,
      errors: [error instanceof Error ? `azure_blob_upload_error: ${error.message}` : "azure_blob_upload_error"],
    };
  }
}

export async function uploadToBlob(
  fileBuffer: Buffer,
  fileName: string,
  companyId: string
): Promise<{ blobPath: string; blobUrl: string }> {
  if (!hasBlobConfig()) {
    throw new Error("Azure Blob Storage not configured");
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  const containerName = process.env.AZURE_STORAGE_CONTAINER!;

  try {
    // Gerar hash SHA256 do arquivo para naming único
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
    const blobName = `documents/${companyId}/${fileHash}/${fileName}`;

    const client = BlobServiceClient.fromConnectionString(connectionString);
    const container = client.getContainerClient(containerName);
    await container.createIfNotExists();

    const blobClient = container.getBlockBlobClient(blobName);

    // Detectar MIME type baseado na extensão
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".tiff": "image/tiff",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Upload com headers apropriados
    await blobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return {
      blobPath: blobName,
      blobUrl: blobClient.url,
    };
  } catch (error) {
    throw new Error(
      `Blob upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
