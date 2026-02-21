import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/lib/requireRole';
import { prisma } from '@/lib/prisma';
import { getJobQueue } from '@/src/lib/queue/documentJobQueue';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const auth = await requireRole(['ADMIN', 'USER']);
    if (!auth.ok) return auth.response;
    const { companyId } = auth.context;

    const job = await prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        document: true,
      },
    });

    if (!job || job.companyId !== companyId) {
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
