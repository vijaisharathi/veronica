import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Validates any arbitrary data against a Zod schema.
 * Throws a normalized ValidationError with structured issues if validation fails.
 */
export function validateData<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    throw new ValidationError("Validation failed", issues);
  }

  return result.data;
}

/**
 * Validates an incoming HTTP Request's JSON body against a Zod schema.
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.output<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON in request body");
  }

  return validateData(schema, body);
}

/**
 * Validates URL search query parameters against a Zod schema.
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): z.output<T> {
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = params[key];
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        params[key] = [existing, value];
      }
    } else {
      params[key] = value;
    }
  }

  return validateData(schema, params);
}
