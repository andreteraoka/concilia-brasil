import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/lib/requireRole';
import { prisma } from '@/lib/prisma';
import { getJobQueue } from '@/src/lib/queue/documentJobQueue';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const auth = await requireRole(['ADMIN', 'USER']);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Obter status de todos os jobs deste documento
    const queue = await getJobQueue();
    const progress = await queue.getDocumentProgress(documentId);

    // Calcular status geral
    const allCompleted = progress.every((j) => j.status === 'completed');
    const anyFailed = progress.some((j) => j.status === 'failed');
    const anyProcessing = progress.some((j) => j.status === 'processing');

    let overallStatus = 'queued';
    if (anyFailed) overallStatus = 'failed';
    else if (allCompleted && progress.length > 0) overallStatus = 'completed';
    else if (anyProcessing) overallStatus = 'processing';

    // Calcular progress geral
    const avgProgress =
      progress.length > 0
        ? Math.round(progress.reduce((sum, j) => sum + j.progress, 0) / progress.length)
        : 0;

    return NextResponse.json(
      {
        documentId,
        fileName: document.fileName,
        overallStatus,
        averageProgress: avgProgress,
        jobsCount: progress.length,
        jobs: progress.map((job) => ({
          jobId: job.id,
          status: job.status,
          stage: job.currentStage,
          progress: job.progress,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          error: job.errorMessage,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error fetching document progress:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch document progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
