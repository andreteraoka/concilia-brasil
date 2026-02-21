import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getJobQueue } from '@/lib/queue/documentJobQueue';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = params;

    // Verificar se documento pertence à empresa do usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { company: true },
    });

    if (!user || !user.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.companyId !== user.company.id) {
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
