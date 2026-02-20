import { QueueHandler, QueuePort, QueueTopic } from "./types";

export class AzureServiceBusQueue implements QueuePort {
  registerHandler<T>(topic: QueueTopic, handler: QueueHandler<T>): void {
    void topic;
    void handler;
    // Worker-based consumption in Azure implementation.
  }

  async enqueue<T>(topic: QueueTopic, payload: T): Promise<string> {
    void topic;
    void payload;
    throw new Error("AzureServiceBusQueue not implemented yet");
  }
}
