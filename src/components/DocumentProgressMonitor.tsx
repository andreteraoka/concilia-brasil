'use client';

import { useDocumentProgress } from '@/hooks/useDocumentProgress';
import { useState } from 'react';

const PROCESSING_STAGES = [
  { key: 'ocr', label: 'Análise OCR', color: 'bg-blue-500' },
  { key: 'classification', label: 'Classificação', color: 'bg-purple-500' },
  { key: 'validation', label: 'Validação', color: 'bg-green-500' },
  { key: 'complete', label: 'Concluído', color: 'bg-emerald-500' },
];

interface DocumentProgressMonitorProps {
  documentId: string;
  onCompleted?: () => void;
  onError?: (error: string) => void;
}

export function DocumentProgressMonitor({
  documentId,
  onCompleted,
  onError,
}: DocumentProgressMonitorProps) {
  const { progress, loading, error } = useDocumentProgress(documentId);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Trigger callbacks
  if (progress) {
    if (progress.overallStatus === 'completed' && previousStatus !== 'completed') {
      setPreviousStatus('completed');
      onCompleted?.();
    }

    if (progress.overallStatus === 'failed' && previousStatus !== 'failed') {
      setPreviousStatus('failed');
      onError?.(progress.jobs[0]?.error || 'Processing failed');
    }
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="text-red-700 font-semibold">Erro ao carregar progresso</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 animate-pulse">
        <p className="text-gray-500">Carregando progresso...</p>
      </div>
    );
  }

  const currentStageIndex = PROCESSING_STAGES.findIndex(
    (s) => s.key === progress.jobs[0]?.currentStage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 border-emerald-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`rounded-lg p-4 border ${getStatusBgColor(progress.overallStatus)}`}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900">{progress.fileName}</p>
          <p className={`text-sm font-medium ${getStatusColor(progress.overallStatus)}`}>
            {progress.overallStatus === 'processing' && '⏳ Processando...'}
            {progress.overallStatus === 'completed' && '✅ Concluído'}
            {progress.overallStatus === 'failed' && '❌ Erro'}
            {progress.overallStatus === 'queued' && '⏳ Aguardando...'}
          </p>
        </div>
        <span className="text-2xl font-bold text-gray-700">{progress.averageProgress}%</span>
      </div>

      {/* Barra de progresso geral */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progress.overallStatus === 'completed'
                ? 'bg-emerald-500'
                : progress.overallStatus === 'failed'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress.averageProgress}%` }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-3 mb-4">
        {PROCESSING_STAGES.map((stage, index) => {
          const isCurrentStage = stage.key === progress.jobs[0]?.currentStage;
          const isPassed = currentStageIndex >= index && progress.overallStatus !== 'queued';
          const isFailed = progress.overallStatus === 'failed' && isCurrentStage;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all ${
                  isFailed
                    ? 'bg-red-500'
                    : isPassed
                    ? 'bg-emerald-500'
                    : isCurrentStage
                    ? `${stage.color} animate-pulse`
                    : 'bg-gray-300'
                }`}
              >
                {isFailed ? '✕' : isPassed ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrentStage || isPassed ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {stage.label}
                </p>
                {isCurrentStage && progress.jobs[0]?.progress && (
                  <p className="text-xs text-gray-500">{progress.jobs[0].progress}%</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Informações adicionais */}
      {progress.jobs.length > 0 && (
        <div className="text-xs text-gray-600 space-y-1 border-t border-gray-300 pt-3">
          <p>
            Iniciado em:{' '}
            {progress.jobs[0].startedAt
              ? new Date(progress.jobs[0].startedAt).toLocaleTimeString()
              : '-'}
          </p>
          {progress.jobs[0].error && (
            <p className="text-red-600">Erro: {progress.jobs[0].error}</p>
          )}
        </div>
      )}
    </div>
  );
}
