export type QueueTopic = "documents.process";

export interface QueueJob<T = unknown> {
  id: string;
  topic: QueueTopic;
  payload: T;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export type QueueHandler<T = unknown> = (job: QueueJob<T>) => Promise<void>;

export interface QueuePort {
  enqueue<T>(topic: QueueTopic, payload: T, options?: { maxAttempts?: number }): Promise<string>;
  registerHandler<T>(topic: QueueTopic, handler: QueueHandler<T>): void;
}
