import { PrismaClient } from '@prisma/client';
import { DocumentIntelligenceClient } from '@azure/ai-document-intelligence';
import OpenAI from 'openai';

type ProcessingStage = 'ocr' | 'classification' | 'validation' | 'complete';

interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number;
  message: string;
}

class DocumentProcessor {
  private prisma: PrismaClient;
  private docIntelligence: DocumentIntelligenceClient;
  private openai: OpenAI;

  constructor(
    prisma: PrismaClient,
    docIntelligence: DocumentIntelligenceClient,
    openai: OpenAI
  ) {
    this.prisma = prisma;
    this.docIntelligence = docIntelligence;
    this.openai = openai;
  }

  private async updateJobProgress(
    jobId: string,
    stage: ProcessingStage,
    progress: number,
    message: string
  ): Promise<void> {
    await this.prisma.processingJob.update({
      where: { id: jobId },
      data: {
        currentStage: stage,
        progress,
        updatedAt: new Date(),
      },
    });
  }

  async processDocument(jobId: string): Promise<void> {
    try {
      const job = await this.prisma.processingJob.findUnique({
        where: { id: jobId },
        include: { document: true },
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Iniciar processamento
      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
          estimatedCompletionAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min estimate
        },
      });

      // STAGE 1: OCR via Document Intelligence
      const ocrText = await this.performOCR(job.blobPath, jobId);

      // STAGE 2: Classificação via OpenAI
      const classifications = await this.classifyDocument(ocrText, jobId);

      // STAGE 3: Validação
      await this.validateAndStructure(ocrText, classifications, jobId);

      // STAGE 4: Completo
      await this.updateJobProgress(
        jobId,
        'complete',
        100,
        'Processamento concluído com sucesso'
      );

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = this.determineErrorType(error);

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage,
          errorType,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.error(`Job ${jobId} failed:`, errorMessage);
    }
  }

  private async performOCR(blobPath: string, jobId: string): Promise<string> {
    console.log(`[${jobId}] Starting OCR processing...`);
    await this.updateJobProgress(jobId, 'ocr', 25, 'Iniciando análise com Document Intelligence');

    try {
      // Simular chamada ao Document Intelligence
      // Em produção: await this.docIntelligence.analyzeDocumentFromUrl(blobPath);
      await this.delay(3000); // Simular processamento

      const ocrText = `[OCR Text extracted from ${blobPath}]\n
        Document date: 2024-01-15
        Account: 1234-5
        Description: Payment invoice
        Amount: R$ 1.234,56`;

      await this.updateJobProgress(jobId, 'ocr', 50, 'OCR concluído com sucesso');

      return ocrText;
    } catch (error) {
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private async classifyDocument(ocrText: string, jobId: string): Promise<object> {
    console.log(`[${jobId}] Starting classification...`);
    await this.updateJobProgress(
      jobId,
      'classification',
      60,
      'Classificando documento com OpenAI'
    );

    try {
      // Simular chamada ao OpenAI
      // Em produção:
      // const response = await this.openai.chat.completions.create({
      //   model: 'gpt-4',
      //   messages: [{
      //     role: 'user',
      //     content: `Analyze this document:\n${ocrText}\n\nProvide: category, transaction_type, confidence`
      //   }]
      // });

      await this.delay(2000); // Simular processamento

      const classifications = {
        category: 'invoice',
        transactionType: 'expense',
        confidence: 0.95,
        suggestedDescription: 'Pagamento de fatura',
        suggestedAmount: 1234.56,
      };

      await this.updateJobProgress(
        jobId,
        'classification',
        80,
        'Classificação concluída'
      );

      return classifications;
    } catch (error) {
      throw new Error(
        `Classification failed: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  private async validateAndStructure(
    ocrText: string,
    classifications: object,
    jobId: string
  ): Promise<void> {
    console.log(`[${jobId}] Validating...`);
    await this.updateJobProgress(jobId, 'validation', 90, 'Validando dados extraídos');

    try {
      // Validação de dados
      await this.delay(1500);

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          ocrText,
          classifications,
          extractedData: {
            sourceFile: 'document',
            validatedAt: new Date().toISOString(),
          },
        },
      });

      await this.updateJobProgress(jobId, 'validation', 95, 'Dados validados com sucesso');
    } catch (error) {
      throw new Error(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  private determineErrorType(
    error: unknown
  ): 'ocr_failed' | 'classification_failed' | 'validation_failed' | 'timeout' {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('OCR')) return 'ocr_failed';
    if (message.includes('Classification')) return 'classification_failed';
    if (message.includes('Validation')) return 'validation_failed';
    if (message.includes('timeout')) return 'timeout';

    return 'validation_failed';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default DocumentProcessor;
