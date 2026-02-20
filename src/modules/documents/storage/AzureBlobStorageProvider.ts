import { StorageProvider, UploadInput, UploadResult } from "./StorageProvider";

export class AzureBlobStorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<UploadResult> {
    void input;
    throw new Error("AzureBlobStorageProvider ainda não foi implementado");
  }

  async remove(filePath: string): Promise<void> {
    void filePath;
    throw new Error("AzureBlobStorageProvider ainda não foi implementado");
  }
}
