/**
 * VÉRONA — Centralized Application Error Taxonomy
 *
 * Strict, type-safe error classes following RFC 7807 problem details semantics.
 * Ensures internal exceptions and database details are never leaked to clients in production.
 */

export interface ErrorResponsePayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/**
 * Base Application Error class for all operational and domain errors.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode = 500, isOperational = true, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public toResponse(requestId?: string, isProduction = process.env.NODE_ENV === "production"): ErrorResponsePayload {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && !isProduction ? { details: this.details } : {}),
        ...(this.details && this.statusCode === 400 ? { details: this.details } : {}), // Safe validation errors can be included
        ...(requestId ? { requestId } : {}),
      },
    };
  }
}

/**
 * Thrown when client request is malformed or invalid.
 */
export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, "BAD_REQUEST", 400, true, details);
  }
}

/**
 * Thrown on security constraint or credential policy violation.
 */
export class SecurityError extends AppError {
  constructor(message = "Security constraint violation", details?: unknown) {
    super(message, "SECURITY_VIOLATION", 403, true, details);
  }
}

/**
 * Thrown when client request payload fails schema validation.
 */
export class ValidationError extends AppError {
  constructor(message = "Invalid request payload", details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, true, details);
  }
}

/**
 * Thrown when an unauthenticated client attempts an operation requiring authentication.
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required to perform this action", code = "AUTHENTICATION_REQUIRED") {
    super(message, code, 401, true);
  }
}

/**
 * Thrown when customer session has expired.
 */
export class SessionExpiredError extends AuthenticationError {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message, "SESSION_EXPIRED");
  }
}

/**
 * Thrown when a customer or staff account is suspended.
 */
export class AccountSuspendedError extends AppError {
  constructor(message = "Your account has been suspended. Please contact support.") {
    super(message, "ACCOUNT_SUSPENDED", 403, true);
  }
}

/**
 * Thrown when an authenticated user lacks permissions for an operation.
 */
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to access this resource", code = "FORBIDDEN") {
    super(message, code, 403, true);
  }
}

/**
 * Thrown when an authenticated customer is forbidden from performing an operation.
 */
export class ForbiddenError extends AuthorizationError {
  constructor(message = "Forbidden: You do not have permission to perform this action") {
    super(message, "FORBIDDEN");
  }
}

/**
 * Thrown when a client exceeds allowed rate limits.
 */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Please slow down.", retryAfterSeconds?: number) {
    super(message, "TOO_MANY_REQUESTS", 429, true, retryAfterSeconds ? { retryAfterSeconds } : undefined);
  }
}

/**
 * Thrown when a user lacks a specific granular RBAC permission.
 */
export class InsufficientPermissionError extends AuthorizationError {
  constructor(permission?: string, message = "Insufficient permission to perform this action") {
    super(permission ? `${message} (${permission})` : message, "INSUFFICIENT_PERMISSION");
  }
}

/**
 * Thrown when attempting to access a resource not owned by the authenticated customer (IDOR).
 */
export class ResourceAccessDeniedError extends AuthorizationError {
  constructor(message = "Access to the requested resource is denied") {
    super(message, "RESOURCE_ACCESS_DENIED");
  }
}

/**
 * Thrown when a requested resource is not found.
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' was not found`
      : `${resource} was not found`;
    super(message, "RESOURCE_NOT_FOUND", 404, true);
  }
}

/**
 * Thrown on resource collision or unique constraint conflict.
 */
export class ConflictError extends AppError {
  constructor(message = "Resource state conflict detected") {
    super(message, "CONFLICT", 409, true);
  }
}

/**
 * Thrown when a business logic rule or domain constraint is violated.
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, code = "BUSINESS_RULE_VIOLATION", details?: unknown) {
    super(message, code, 422, true, details);
  }
}

/**
 * Thrown when a downstream 3rd party integration fails or times out.
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName: string, message = "Downstream service error") {
    super(`${serviceName}: ${message}`, "EXTERNAL_SERVICE_ERROR", 502, true);
  }
}

/**
 * Thrown when an address fails structural or semantic validation.
 */
export class InvalidAddressError extends AppError {
  constructor(message = "Invalid address payload", details?: unknown) {
    super(message, "INVALID_ADDRESS", 400, true, details);
  }
}

/**
 * Thrown when an Indian postal code fails syntax or numeric format checks.
 */
export class InvalidPincodeError extends AppError {
  constructor(message = "Invalid 6-digit Indian PIN code format", details?: unknown) {
    super(message, "INVALID_PINCODE", 400, true, details);
  }
}

/**
 * Thrown when a customer address cannot be located.
 */
export class AddressNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Address '${id}' not found` : "Address not found", "ADDRESS_NOT_FOUND", 404, true);
  }
}

/**
 * Thrown when a customer attempts to access or modify an address belonging to another customer.
 */
export class AddressNotOwnedError extends AppError {
  constructor(message = "You do not have permission to access or modify this address") {
    super(message, "ADDRESS_NOT_OWNED", 403, true);
  }
}

/**
 * Thrown when delivery serviceability checks fail due to provider outage or configuration failure.
 */
export class ServiceabilityUnavailableError extends AppError {
  constructor(message = "Delivery serviceability is temporarily unavailable") {
    super(message, "SERVICEABILITY_UNAVAILABLE", 503, true);
  }
}

/**
 * Thrown when a delivery serviceability request is malformed.
 */
export class InvalidServiceabilityRequestError extends AppError {
  constructor(message = "Invalid serviceability check parameters", details?: unknown) {
    super(message, "INVALID_SERVICEABILITY_REQUEST", 400, true, details);
  }
}

/**
 * Thrown on unhandled server or infrastructure failures.
 */
export class InternalServerError extends AppError {
  constructor(message = "An unexpected error occurred. Please try again later.") {
    super(message, "INTERNAL_SERVER_ERROR", 500, false);
  }
}

/**
 * Converts any unknown error into a normalized AppError.
 * Guarantees that sensitive internal database messages or unhandled exceptions are masked.
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Handle standard Error instances safely without leaking internals in production
  if (error instanceof Error) {
    const isDev = process.env.NODE_ENV === "development";
    return new InternalServerError(
      isDev ? `Internal Error: ${error.message}` : "An unexpected server error occurred"
    );
  }

  return new InternalServerError();
}
