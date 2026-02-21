import { PrismaClient } from '@prisma/client';
import DocumentProcessor from './DocumentProcessor';
import { DocumentIntelligenceClient } from '@azure/ai-document-intelligence';
import OpenAI from 'openai';

interface JobConfig {
  maxConcurrent: number;
  pollInterval: number; // ms
  maxRetries: number;
}

class JobQueue {
  private prisma: PrismaClient;
  private processor: DocumentProcessor;
  private config: JobConfig;
  private isRunning: boolean = false;
  private activeJobs: Set<string> = new Set();

  constructor(
    prisma: PrismaClient,
    docIntelligence: DocumentIntelligenceClient,
    openai: OpenAI,
    config: Partial<JobConfig> = {}
  ) {
    this.prisma = prisma;
    this.processor = new DocumentProcessor(prisma, docIntelligence, openai);
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      pollInterval: config.pollInterval ?? 5000, // 5 seg
      maxRetries: config.maxRetries ?? 3,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('JobQueue already running');
      return;
    }

    this.isRunning = true;
    console.log('JobQueue started');

    this.poll();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('JobQueue stopped');
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        // Pegar próximos jobs a processar
        if (this.activeJobs.size < this.config.maxConcurrent) {
          const availableSlots = this.config.maxConcurrent - this.activeJobs.size;

          const pendingJobs = await this.prisma.processingJob.findMany({
            where: {
              status: 'queued',
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: availableSlots,
          });

          // Começar processamento
          for (const job of pendingJobs) {
            this.activeJobs.add(job.id);
            this.processor.processDocument(job.id).finally(() => {
              this.activeJobs.delete(job.id);
            });
          }
        }

        // Verificar jobs que estão processando
        await this.checkProcessingJobs();

        // Aguardar antes de próximo poll
        await this.delay(this.config.pollInterval);
      } catch (error) {
        console.error('Error in JobQueue poll:', error);
        await this.delay(this.config.pollInterval);
      }
    }
  }

  private async checkProcessingJobs(): Promise<void> {
    // Verificar timeout de jobs que estão processando por muito tempo
    const timeoutThresholdMs = 15 * 60 * 1000; // 15 minutos

    const timedOutJobs = await this.prisma.processingJob.findMany({
      where: {
        status: 'processing',
        startedAt: {
          lt: new Date(Date.now() - timeoutThresholdMs),
        },
      },
    });

    for (const job of timedOutJobs) {
      console.warn(`Job ${job.id} timed out after 15 minutes`);
      await this.prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: 'Processing timeout (>15 minutes)',
          errorType: 'timeout',
          completedAt: new Date(),
        },
      });
    }
  }

  // API pública para adicionar novo job à fila
  async enqueueDocument(
    documentId: string,
    companyId: string,
    blobPath: string,
    fileName: string,
    fileSize: number
  ): Promise<string> {
    const job = await this.prisma.processingJob.create({
      data: {
        documentId,
        companyId,
        blobPath,
        fileName,
        fileSize,
        status: 'queued',
      },
    });

    console.log(`Job ${job.id} enqueued for document ${documentId}`);
    return job.id;
  }

  // Obter status de um job
  async getJobStatus(jobId: string) {
    const job = await this.prisma.processingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      id: job.id,
      status: job.status,
      currentStage: job.currentStage,
      progress: job.progress,
      errorMessage: job.errorMessage,
      errorType: job.errorType,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  // Obter progresso de múltiplos jobs (por documentId)
  async getDocumentProgress(documentId: string) {
    const jobs = await this.prisma.processingJob.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => ({
      id: job.id,
      status: job.status,
      currentStage: job.currentStage,
      progress: job.progress,
      fileName: job.fileName,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default JobQueue;
