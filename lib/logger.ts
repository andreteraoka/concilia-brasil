type LogLevel = "debug" | "info" | "warn" | "error";
type LogCategory = "app" | "auth" | "document-processing";
type LogContext = Record<string, unknown>;

type LogTransport = (entry: LogEntry) => void;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  service: string;
  env: string;
  context?: LogContext;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
  };
}

function toErrorObject(err?: unknown): LogEntry["error"] | undefined {
  if (!err) return undefined;
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: isDevelopment ? err.stack : undefined,
      code: (err as { code?: string | number }).code,
    };
  }
  return { message: String(err) };
}

function defaultTransport(entry: LogEntry) {
  // In production, use stderr only for errors and warnings
  if (process.env.NODE_ENV === "production") {
    if (entry.level === "error" || entry.level === "warn") {
      // Remove sensitive data in production
      const safeEntry = {
        ...entry,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          code: entry.error.code,
          // stack is deliberately excluded in production
        } : undefined,
      };
      
      const payload = JSON.stringify(safeEntry);
      if (entry.level === "error") {
        console.error(payload);
      } else {
        console.warn(payload);
      }
    }
    // info and debug logs are not output in production
    return;
  }
  
  // In development, log everything with full details
  const payload = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(payload);
    return;
  }
  if (entry.level === "warn") {
    console.warn(payload);
    return;
  }
  console.log(payload);
}

class Logger {
  private readonly service = process.env.APP_NAME || "concilia-brasil";
  private readonly env = process.env.NODE_ENV || "development";
  private transport: LogTransport = defaultTransport;

  setTransport(transport: LogTransport) {
    this.transport = transport;
  }

  private write(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: unknown
  ) {
    this.transport({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      service: this.service,
      env: this.env,
      context,
      error: toErrorObject(error),
    });
  }

  info(message: string, context?: LogContext) {
    this.write("info", "app", message, context);
  }

  error(message: string, error?: unknown, context?: LogContext) {
    this.write("error", "app", message, context, error);
  }

  authInfo(message: string, context?: LogContext) {
    this.write("info", "auth", message, context);
  }

  authError(message: string, error?: unknown, context?: LogContext) {
    this.write("error", "auth", message, context, error);
  }

  documentInfo(message: string, context?: LogContext) {
    this.write("info", "document-processing", message, context);
  }

  documentError(message: string, error?: unknown, context?: LogContext) {
    this.write("error", "document-processing", message, context, error);
  }
}

export const logger = new Logger();

export function setLoggerTransport(transport: LogTransport) {
  logger.setTransport(transport);
}
