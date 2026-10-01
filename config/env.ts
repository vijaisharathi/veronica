import { z } from "zod";

/**
 * Environment variable schema validation using Zod.
 * Enforces strict typing and early detection of missing or invalid runtime configurations.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000))
    .pipe(z.number().positive()),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default("mongodb://localhost:27017/verona"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  RAZORPAY_KEY_ID: z
    .string()
    .default("rzp_test_verona_demo"),
  RAZORPAY_KEY_SECRET: z
    .string()
    .default("rzp_test_secret_demo"),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .default("rzp_webhook_secret_demo"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z
    .string()
    .default("rzp_test_verona_demo"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates provided environment record against the env schema.
 * Throws a formatted diagnostic error if validation fails.
 */
export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    const errorMessage = `[VÉRONA ENV ERROR] Invalid environment configuration:\n${formattedErrors}\nPlease review your .env.local file.`;
    throw new Error(errorMessage);
  }

  return result.data;
}

/**
 * Application environment configuration singleton.
 * Uses process.env values in runtime environments.
 */
export const env: Env = validateEnv(process.env);
