import { AzureServiceBusQueue } from "./azureServiceBusQueue";
import { InMemoryQueue } from "./inMemoryQueue";
import { QueuePort } from "./types";

let queue: QueuePort | null = null;

export function getQueue() {
  if (queue) {
    return queue;
  }

  const driver = process.env.QUEUE_DRIVER || "in-memory";
  queue = driver === "azure-service-bus" ? new AzureServiceBusQueue() : new InMemoryQueue();
  return queue;
}
