import { readFile } from "fs/promises";
import path from "path";
import { BlobServiceClient } from "@azure/storage-blob";

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
