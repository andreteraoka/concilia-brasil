'use client';

import { DocumentUploadPanel } from '@/src/components/DocumentUploadPanel';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Documentos</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Upload e processamento automático de documentos. Você pode enviar múltiplos arquivos
          enquanto outros são processados.
        </p>
      </div>

      {/* Upload Panel */}
      <div className="rounded-lg border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <DocumentUploadPanel />
      </div>

      {/* Informações sobre processamento */}
      <div className="rounded-lg border bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
          ℹ️ Como funciona o processamento
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>
            <strong>1. Upload rápido:</strong> Seu arquivo é salvo imediatamente no Azure Blob
            Storage
          </li>
          <li>
            <strong>2. Análise OCR:</strong> O Document Intelligence extrai o texto do documento
          </li>
          <li>
            <strong>3. Classificação:</strong> OpenAI classifica transações e extrai dados
            estruturados
          </li>
          <li>
            <strong>4. Validação:</strong> Os dados são validados e preparados para importação
          </li>
        </ul>
      </div>
    </div>
  );
}
