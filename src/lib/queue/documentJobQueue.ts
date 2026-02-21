import JobQueue from './JobQueue';
import { prisma } from '@/lib/prisma';

let jobQueue: JobQueue | null = null;

export async function getJobQueue(): Promise<JobQueue> {
  if (jobQueue) {
    return jobQueue;
  }

  // Inicializar Job Queue (sem dependências externas - clients lazy loaded)
  jobQueue = new JobQueue(prisma, {
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
