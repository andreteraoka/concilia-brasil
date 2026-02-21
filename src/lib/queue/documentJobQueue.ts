import JobQueue from './JobQueue';
import { prisma } from '@/lib/prisma';
import { DocumentIntelligenceClient } from '@azure/ai-document-intelligence';
import { AzureKeyCredential } from '@azure/core-auth';
import OpenAI from 'openai';

let jobQueue: JobQueue | null = null;

export async function getJobQueue(): Promise<JobQueue> {
  if (jobQueue) {
    return jobQueue;
  }

  // Inicializar Job Queue
  const docIntelligence = new DocumentIntelligenceClient(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '',
    new AzureKeyCredential(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '')
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  jobQueue = new JobQueue(prisma, docIntelligence, openai, {
    maxConcurrent: parseInt(process.env.PROCESSING_MAX_CONCURRENT || '5', 10),
    pollInterval: parseInt(process.env.PROCESSING_POLL_INTERVAL || '5000', 10),
  });

  return jobQueue;
}

export async function startJobQueue(): Promise<void> {
  const queue = await getJobQueue();
  await queue.start();
  console.log('DocumentProcessing JobQueue started');
}

export async function stopJobQueue(): Promise<void> {
  if (jobQueue) {
    await jobQueue.stop();
    jobQueue = null;
  }
}

export { JobQueue };
