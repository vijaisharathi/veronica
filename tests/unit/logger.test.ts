import { describe, it, expect } from "vitest";
import { sanitizeLogData } from "@/lib/logger";

describe("Logger Sanitization", () => {
  it("should deeply redact sensitive credential keys", () => {
    const rawData = {
      user: "customer@example.com",
      password: "SuperSecretPassword123!",
      auth: {
        token: "jwt.secret.token",
        apiKey: "api_key_xyz987",
      },
      payment: {
        creditCard: "4111-2222-3333-4444",
        cvv: "123",
      },
      metadata: {
        safeField: "safe value",
      },
    };

    const sanitized = sanitizeLogData(rawData) as Record<string, unknown>;

    expect(sanitized.user).toBe("customer@example.com");
    expect(sanitized.password).toBe("[REDACTED]");
    expect((sanitized.auth as Record<string, unknown>).token).toBe("[REDACTED]");
    expect((sanitized.auth as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((sanitized.payment as Record<string, unknown>).creditCard).toBe("[REDACTED]");
    expect((sanitized.payment as Record<string, unknown>).cvv).toBe("[REDACTED]");
    expect((sanitized.metadata as Record<string, unknown>).safeField).toBe("safe value");
  });

  it("should handle arrays and primitive values cleanly", () => {
    expect(sanitizeLogData("simple string")).toBe("simple string");
    expect(sanitizeLogData(42)).toBe(42);
    expect(sanitizeLogData(null)).toBe(null);

    const arrayData = [{ token: "abc" }, { normal: "123" }];
    const sanitizedArray = sanitizeLogData(arrayData) as Array<Record<string, unknown>>;
    expect(sanitizedArray[0]?.token).toBe("[REDACTED]");
    expect(sanitizedArray[1]?.normal).toBe("123");
  });
});
