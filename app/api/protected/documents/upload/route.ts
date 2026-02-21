import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToBlob } from '@/modules/documents/pipeline/blob';
import { getJobQueue } from '@/lib/queue/documentJobQueue';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter user com company
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { company: true },
    });

    if (!user || !user.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    // Parsear FormData
    const formData = await req.formData();
    const files: File[] = [];

    // Suportar múltiplos arquivos
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedDocuments: Array<{
      documentId: string;
      jobId: string;
      fileName: string;
      blobPath: string;
    }> = [];

    // Processar cada arquivo (rapidamente)
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        // STAGE 1: Upload para Blob Storage (rápido, síncrono)
        logger.info(`Starting blob upload for file: ${file.name}`);
        const blobResult = await uploadToBlob(fileBuffer, file.name, user.company.id);

        // STAGE 2: Criar Document no banco
        const document = await prisma.document.create({
          data: {
            fileName: file.name,
            fileType: file.type,
            status: 'uploaded',
            companyId: user.company.id,
          },
        });

        logger.info(`Document created: ${document.id}`);

        // STAGE 3: Criar ProcessingJob na fila
        const queue = await getJobQueue();
        const jobId = await queue.enqueueDocument(
          document.id,
          user.company.id,
          blobResult.blobPath,
          file.name,
          fileBuffer.length
        );

        logger.info(`Job enqueued: ${jobId} for document: ${document.id}`);

        uploadedDocuments.push({
          documentId: document.id,
          jobId,
          fileName: file.name,
          blobPath: blobResult.blobPath,
        });
      } catch (fileError) {
        logger.error(`Error uploading file ${file.name}:`, fileError);
        // Continuar com próximos arquivos
      }
    }

    if (uploadedDocuments.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any files' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: uploadedDocuments.length,
        documents: uploadedDocuments,
        message: `${uploadedDocuments.length} document(s) uploaded. Processing started in background.`,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Document upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
