import { useEffect, useState, useCallback } from 'react';

interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  currentStage?: string;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface DocumentProgress {
  documentId: string;
  fileName: string;
  overallStatus: 'queued' | 'processing' | 'completed' | 'failed';
  averageProgress: number;
  jobsCount: number;
  jobs: JobStatus[];
}

const POLL_INTERVAL = 2000; // 2 segundos

export function useDocumentProgress(documentId: string | null) {
  const [progress, setProgress] = useState<DocumentProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/protected/documents/${documentId}/status`);

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      setProgress(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    // Fetch inicial
    fetchProgress();

    // Setup polling
    const interval = setInterval(fetchProgress, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchProgress]);

  return { progress, loading, error };
}

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/protected/documents/jobs/${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data = await response.json();
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { job, loading, error };
}
