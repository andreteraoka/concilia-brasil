import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { QueueHandler, QueueJob, QueuePort, QueueTopic } from "./types";

export class InMemoryQueue implements QueuePort {
  private readonly jobs: QueueJob[] = [];
  private readonly handlers = new Map<QueueTopic, QueueHandler>();
  private processing = false;

  registerHandler<T>(topic: QueueTopic, handler: QueueHandler<T>) {
    this.handlers.set(topic, handler as QueueHandler);
  }

  async enqueue<T>(topic: QueueTopic, payload: T, options?: { maxAttempts?: number }) {
    const id = randomUUID();
    this.jobs.push({
      id,
      topic,
      payload,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      createdAt: new Date().toISOString(),
    });

    logger.documentInfo("Job enqueued", { topic, jobId: id });
    setTimeout(() => {
      void this.drain();
    }, 10);
    return id;
  }

  private async drain() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (this.jobs.length > 0) {
        const job = this.jobs.shift();
        if (!job) {
          continue;
        }
        const handler = this.handlers.get(job.topic);

        if (!handler) {
          logger.documentError("No handler registered", undefined, { topic: job.topic, jobId: job.id });
          continue;
        }

        try {
          job.attempts += 1;
          await handler(job);
          logger.documentInfo("Job processed", { topic: job.topic, jobId: job.id, attempts: job.attempts });
        } catch (error) {
          logger.documentError("Job processing failed", error, {
            topic: job.topic,
            jobId: job.id,
            attempts: job.attempts,
          });

          if (job.attempts < job.maxAttempts) {
            this.jobs.push(job);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
