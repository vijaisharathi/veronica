import { describe, it, expect } from "vitest";
import { apiSuccess, apiError } from "@/lib/response";
import { ValidationError, NotFoundError } from "@/lib/errors";

describe("API Response Utilities", () => {
  it("should generate standardized success JSON response", async () => {
    const payload = { id: "prod_1", title: "Silk Blazer" };
    const response = apiSuccess(payload, {
      status: 200,
      meta: { page: 1, limit: 10 },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: payload,
      meta: { page: 1, limit: 10 },
    });
  });

  it("should generate standardized error JSON response from AppError", async () => {
    const error = new NotFoundError("Category", "jackets");
    const response = apiError(error, { requestId: "req-999" });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Category with identifier 'jackets' was not found",
        requestId: "req-999",
      },
    });
  });

  it("should generate 400 error response from ValidationError", async () => {
    const error = new ValidationError("Invalid email address", [
      { path: "email", message: "Required" },
    ]);
    const response = apiError(error);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });
});
