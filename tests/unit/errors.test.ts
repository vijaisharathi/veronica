import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  BusinessRuleError,
  ExternalServiceError,
  InternalServerError,
  normalizeError,
} from "@/lib/errors";

describe("Application Error Taxonomy", () => {
  it("should construct AppError with correct defaults", () => {
    const error = new AppError("Base error", "BASE_ERROR", 400);
    expect(error.message).toBe("Base error");
    expect(error.code).toBe("BASE_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it("should assign correct HTTP status codes to specialized errors", () => {
    expect(new ValidationError().statusCode).toBe(400);
    expect(new AuthenticationError().statusCode).toBe(401);
    expect(new AuthorizationError().statusCode).toBe(403);
    expect(new NotFoundError("Product").statusCode).toBe(404);
    expect(new ConflictError().statusCode).toBe(409);
    expect(new BusinessRuleError("Rule broken").statusCode).toBe(422);
    expect(new ExternalServiceError("PaymentGateway").statusCode).toBe(502);
    expect(new InternalServerError().statusCode).toBe(500);
  });

  it("should serialize error response correctly", () => {
    const error = new NotFoundError("SKU", "VER-1092");
    const response = error.toResponse("req-test-123");

    expect(response).toEqual({
      success: false,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "SKU with identifier 'VER-1092' was not found",
        requestId: "req-test-123",
      },
    });
  });

  it("should normalize an unknown Error instance to an InternalServerError", () => {
    const rawError = new Error("Database connection timed out");
    const normalized = normalizeError(rawError);

    expect(normalized).toBeInstanceOf(InternalServerError);
    expect(normalized.statusCode).toBe(500);
    expect(normalized.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("should preserve existing AppError when normalizing", () => {
    const validationErr = new ValidationError("Email invalid");
    const normalized = normalizeError(validationErr);

    expect(normalized).toBe(validationErr);
  });
});
