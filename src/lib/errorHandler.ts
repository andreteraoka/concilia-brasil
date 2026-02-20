import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = "Token ausente ou inválido") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = "Acesso negado") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

interface BaseErrorResponse {
  success: false;
  error: string;
  code?: string;
  requestId: string;
  timestamp: string;
}

interface DevelopmentErrorResponse extends BaseErrorResponse {
  details?: unknown;
  stack?: string;
}

function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro interno do servidor";
}

export function handleApiError(
  error: unknown,
  requestId: string = uuidv4()
): NextResponse<BaseErrorResponse> {
  const timestamp = new Date().toISOString();
  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle Zod Validation Errors
  if (isZodError(error)) {
    const message = "Dados de entrada inválidos";
    const details = error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    logger.error("Validation error", error, {
      requestId,
      details,
    });

    const response: Record<string, unknown> = {
      success: false,
      error: message,
      code: "VALIDATION_ERROR",
      requestId,
      timestamp,
    };

    if (isDevelopment) {
      response.details = details;
    }

    return NextResponse.json(response, { status: 400 });
  }

  // Handle Custom API Errors
  if (isApiError(error)) {
    logger.error(`API Error [${error.code}]: ${error.message}`, error, {
      requestId,
      statusCode: error.statusCode,
      code: error.code,
    });

    const response: Record<string, unknown> = {
      success: false,
      error: error.message,
      code: error.code,
      requestId,
      timestamp,
    };

    if (isDevelopment) {
      response.stack = error.stack;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle Standard Errors
  const message = sanitizeErrorMessage(error);

  logger.error("Unhandled error", error, {
    requestId,
    type: error instanceof Error ? error.constructor.name : typeof error,
  });

  const response: Record<string, unknown> = {
    success: false,
    error:
      isDevelopment ? message : "Erro interno do servidor. ID: " + requestId,
    requestId,
    timestamp,
  };

  if (isDevelopment) {
    response.stack = error instanceof Error ? error.stack : undefined;
    response.details = error;
  }

  return NextResponse.json(response, { status: 500 });
}

export function withErrorHandler(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    const requestId = uuidv4();
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error, requestId);
    }
  };
}
