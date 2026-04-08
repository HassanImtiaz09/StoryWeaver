/**
 * Structured logger for production logging
 * Outputs JSON in production, pretty-prints in development
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  requestId?: string;
  userId?: number;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Sensitive field names that should be redacted
 */
const SENSITIVE_FIELDS = ["password", "token", "apiKey", "secret", "authorization", "cookie"];

/**
 * Check if a value should be redacted
 */
function shouldRedact(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));
}

/**
 * Recursively redact sensitive fields from an object
 */
function redactSensitive(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (shouldRedact(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Structured logger
 */
export class Logger {
  private context: Record<string, any>;
  private isProduction: boolean;
  private service: string;

  constructor(service: string, isProduction = process.env.NODE_ENV === "production") {
    this.service = service;
    this.isProduction = isProduction;
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, any>): Logger {
    const child = new Logger(this.service, this.isProduction);
    child.context = { ...this.context, ...additionalContext };
    return child;
  }

  /**
   * Create a logger scoped to a request ID
   */
  withRequestId(requestId: string): Logger {
    return this.child({ requestId });
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log("debug", message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log("info", message, metadata);
  }

  /**
   * Log a warning
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log("warn", message, metadata);
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error | Record<string, any>, metadata?: Record<string, any>): void {
    let errorObj: LogEntry["error"] | undefined;

    if (error instanceof Error) {
      errorObj = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    } else if (error && typeof error === "object") {
      errorObj = error as LogEntry["error"];
    }

    const fullMetadata = errorObj ? { ...metadata, error: errorObj } : metadata;
    this.log("error", message, fullMetadata);
  }

  /**
   * Log a fatal error
   */
  fatal(message: string, error?: Error | Record<string, any>, metadata?: Record<string, any>): void {
    let errorObj: LogEntry["error"] | undefined;

    if (error instanceof Error) {
      errorObj = {
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
        code: (error as any).code,
      };
    } else if (error && typeof error === "object") {
      errorObj = error as LogEntry["error"];
    }

    const fullMetadata = errorObj ? { ...metadata, error: errorObj } : metadata;
    this.log("fatal", message, fullMetadata);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...this.context,
      ...(metadata && { metadata: redactSensitive(metadata) }),
    };

    const output = this.isProduction ? JSON.stringify(entry) : this.prettyPrint(entry);

    // Use appropriate console method
    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
      case "fatal":
        console.error(output);
        break;
    }
  }

  /**
   * Pretty print log entry for development
   */
  private prettyPrint(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m", // green
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
      fatal: "\x1b[35m", // magenta
    };

    const reset = "\x1b[0m";
    const color = levelColors[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    let output = `${color}[${timestamp}] [${entry.level.toUpperCase()}]${reset} ${entry.message}`;

    if (entry.requestId) {
      output += ` (req: ${entry.requestId})`;
    }

    if (entry.userId) {
      output += ` (user: ${entry.userId})`;
    }

    if (entry.duration) {
      output += ` (${entry.duration}ms)`;
    }

    if (entry.metadata) {
      output += `\n  ${JSON.stringify(entry.metadata, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack && !this.isProduction) {
        output += `\n  ${entry.error.stack}`;
      }
    }

    return output;
  }
}

/**
 * Create a logger for a service
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}

/**
 * Global logger instance
 */
export const logger = createLogger("api");
