export interface UploadInput {
  companyId: string;
  fileName: string;
  buffer: Buffer;
  contentType?: string;
}

export interface UploadResult {
  provider: "local" | "azure-blob";
  filePath: string;
  publicUrl: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  remove(filePath: string): Promise<void>;
}
