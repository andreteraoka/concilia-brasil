'use client';

import { useState, useRef } from 'react';
import { DocumentProgressMonitor } from './DocumentProgressMonitor';

interface UploadedFile {
  documentId: string;
  jobId: string;
  fileName: string;
  blobPath: string;
}

export function DocumentUploadPanel() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList) {
    try {
      setError(null);
      setIsUploading(true);

      const formData = new FormData();

      // Adicionar múltiplos arquivos
      for (const file of Array.from(files)) {
        formData.append('files', file);
      }

      const response = await fetch('/api/protected/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setUploadedFiles((prev) => [...prev, ...data.documents]);
      setUploadProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleUpload(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Área de Upload */}
      <div className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            disabled={isUploading}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
          />

          <div className="space-y-2">
            <p className="text-2xl">📄</p>
            <p className="font-semibold text-gray-900">
              {isUploading ? 'Enviando...' : 'Arrastar arquivos aqui'}
            </p>
            <p className="text-sm text-gray-600">
              ou clique para selecionar arquivos
            </p>
            <p className="text-xs text-gray-500">
              Formatos suportados: PDF, JPG, PNG, TIFF, DOC, DOCX
            </p>
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-red-700 font-semibold">Erro no upload</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Lista de documentos enviados */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Documentos em processamento</h3>
          <div className="grid grid-cols-1 gap-4">
            {uploadedFiles.map((file) => (
              <DocumentProgressMonitor
                key={file.documentId}
                documentId={file.documentId}
                onCompleted={() => {
                  console.log(`Document ${file.documentId} completed`);
                }}
                onError={(error) => {
                  console.error(`Document ${file.documentId} failed:`, error);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
