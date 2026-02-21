import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getJobQueue } from '@/lib/queue/documentJobQueue';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = params;

    // Verificar autorização (job pertence à empresa do usuário)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { company: true },
    });

    if (!user || !user.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const job = await prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        document: true,
      },
    });

    if (!job || job.companyId !== user.company.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Obter status via queue
    const queue = await getJobQueue();
    const status = await queue.getJobStatus(jobId);

    return NextResponse.json(
      {
        jobId: job.id,
        documentId: job.documentId,
        fileName: job.fileName,
        fileSize: job.fileSize,
        status: job.status,
        currentStage: job.currentStage,
        progress: job.progress,
        blobPath: job.blobPath,
        
        // Resultados
        ocrText: job.ocrText || null,
        extractedData: job.extractedData || null,
        classifications: job.classifications || null,
        
        // Erros
        errorMessage: job.errorMessage || null,
        errorType: job.errorType || null,
        
        // Timeline
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        estimatedCompletionAt: job.estimatedCompletionAt,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error fetching job details:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch job details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
