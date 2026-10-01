/**
 * VÉRONA — Structured Logger Abstraction
 *
 * Implements structured logging with redaction for sensitive fields (passwords, tokens, secrets).
 * Abstracted to easily swap with Datadog, Pino, or Winston in future production environments.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /cvc/i,
  /pin/i,
  /cookie/i,
];

/**
 * Deeply redacts sensitive keys from log payloads to prevent credential leakage.
 */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: unknown;
}

class Logger {
  private minLevel: LogLevel = "info";

  constructor() {
    const configuredLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    if (configuredLevel && configuredLevel in LOG_LEVEL_PRIORITY) {
      this.minLevel = configuredLevel;
    }
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private write(level: LogLevel, message: string, meta?: unknown, context?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
      ...(meta !== undefined ? { metadata: sanitizeLogData(meta) } : {}),
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        console.debug(output);
        break;
      default:
        console.log(output);
        break;
    }
  }

  public debug(message: string, meta?: unknown, context?: string): void {
    this.write("debug", message, meta, context);
  }

  public info(message: string, meta?: unknown, context?: string): void {
    this.write("info", message, meta, context);
  }

  public warn(message: string, meta?: unknown, context?: string): void {
    this.write("warn", message, meta, context);
  }

  public error(message: string, meta?: unknown, context?: string): void {
    this.write("error", message, meta, context);
  }
}

export const logger = new Logger();
