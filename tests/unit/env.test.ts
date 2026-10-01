import { describe, it, expect } from "vitest";
import { validateEnv } from "@/config/env";

describe("Environment Validation", () => {
  it("should validate and apply defaults for minimal environment variables", () => {
    const rawEnv = {
      DATABASE_URL: "mongodb://localhost:27017/verona_test",
    };

    const parsed = validateEnv(rawEnv);
    expect(parsed.DATABASE_URL).toBe("mongodb://localhost:27017/verona_test");
    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.PORT).toBe(3000);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(parsed.LOG_LEVEL).toBe("info");
  });

  it("should parse custom valid configuration", () => {
    const rawEnv = {
      DATABASE_URL: "mongodb+srv://user:pass@cluster0.mongodb.net/verona_prod",
      NODE_ENV: "production",
      PORT: "8080",
      NEXT_PUBLIC_APP_URL: "https://verona-fashion.com",
      LOG_LEVEL: "warn",
    };

    const parsed = validateEnv(rawEnv);
    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.PORT).toBe(8080);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://verona-fashion.com");
    expect(parsed.LOG_LEVEL).toBe("warn");
  });

  it("should throw a descriptive error when NEXT_PUBLIC_APP_URL is invalid", () => {
    const rawEnv = {
      DATABASE_URL: "mongodb://localhost:27017/verona",
      NEXT_PUBLIC_APP_URL: "invalid-url-format",
    };

    expect(() => validateEnv(rawEnv)).toThrowError(/NEXT_PUBLIC_APP_URL must be a valid URL/);
  });

  it("should throw an error when DATABASE_URL is missing or empty", () => {
    const rawEnv = {
      DATABASE_URL: "",
    };

    expect(() => validateEnv(rawEnv)).toThrowError(/DATABASE_URL is required/);
  });
});
