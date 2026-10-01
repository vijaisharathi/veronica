import { NextResponse } from "next/server";
import { AppError, normalizeError } from "./errors";

/**
 * Standard API Success Response Envelope
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Standard API Error Response Envelope
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SuccessResponseOptions {
  status?: number;
  meta?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface ErrorResponseOptions {
  requestId?: string;
  headers?: Record<string, string>;
}

/**
 * Factory for creating standardized successful JSON responses.
 */
export function apiSuccess<T>(
  data: T,
  options: SuccessResponseOptions = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { status = 200, meta, headers } = options;

  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };

  return NextResponse.json(payload, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Factory for creating standardized error JSON responses from an AppError or unknown exception.
 */
export function apiError(
  error: unknown,
  options: ErrorResponseOptions = {}
): NextResponse<ApiErrorResponse> {
  const { requestId, headers } = options;
  const appError: AppError = normalizeError(error);
  const payload = appError.toResponse(requestId);

  return NextResponse.json(payload, {
    status: appError.statusCode,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
