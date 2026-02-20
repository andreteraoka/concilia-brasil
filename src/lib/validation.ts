import { ZodSchema } from "zod";
import { ValidationError } from "@/src/lib/errorHandler";

export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Body JSON inválido");
  }

  const result = await schema.safeParseAsync(body);

  if (!result.success) {
    throw new ValidationError("Validação de dados falhou", result.error.errors);
  }

  return result.data as T;
}

export function validateBody<T>(
  body: unknown,
  schema: ZodSchema
): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Validação de dados falhou", result.error.errors);
  }

  return result.data as T;
}

export function validateQuery<T>(
  params: Record<string, string | string[] | undefined>,
  schema: ZodSchema
): T {
  const result = schema.safeParse(params);

  if (!result.success) {
    throw new ValidationError("Parâmetros de query inválidos", result.error.errors);
  }

  return result.data as T;
}

export async function validateFromUrl<T>(
  url: string,
  schema: ZodSchema
): Promise<T> {
  const searchParams = new URL(url).searchParams;
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateQuery(params, schema);
}
