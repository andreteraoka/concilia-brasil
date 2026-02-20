import { AzureBlobStorageProvider } from "../storage/AzureBlobStorageProvider";
import { LocalStorageProvider } from "../storage/LocalStorageProvider";
import { StorageProvider, UploadInput } from "../storage/StorageProvider";

const providerName = process.env.STORAGE_PROVIDER || "local";

function createProvider(): StorageProvider {
  if (providerName === "azure-blob") {
    return new AzureBlobStorageProvider();
  }

  return new LocalStorageProvider();
}

class StorageService {
  private readonly provider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.provider = provider || createProvider();
  }

  uploadDocument(input: UploadInput) {
    return this.provider.upload(input);
  }

  removeDocument(filePath: string) {
    return this.provider.remove(filePath);
  }
}

export const storageService = new StorageService();
export { StorageService };
