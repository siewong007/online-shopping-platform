import type { ErrorContext, ErrorReporter, NormalizedError, ValidationFieldError } from "./types";

type ErrorCopy = {
  severity: NormalizedError["severity"];
  title: string;
  message: string;
  retryable?: boolean;
};

export const ERROR_MESSAGE_MAP: Readonly<Record<string, ErrorCopy>> = Object.freeze({
  BAD_REQUEST: { severity: "warning", title: "Check your request", message: "Some information was not accepted. Review it and try again." },
  UNAUTHORIZED: { severity: "warning", title: "Session expired", message: "Sign in again to continue." },
  AUTH_SESSION_EXPIRED: { severity: "warning", title: "Session expired", message: "Sign in again to continue." },
  METHOD_NOT_ALLOWED: { severity: "warning", title: "Action not available", message: "This action is not available here. Return to the page and try again." },
  REQUEST_TIMEOUT: { severity: "error", title: "Request timed out", message: "The service took too long to respond. Try again.", retryable: true },
  PAYLOAD_TOO_LARGE: { severity: "warning", title: "File is too large", message: "Choose a smaller file and try again." },
  UNSUPPORTED_MEDIA_TYPE: { severity: "warning", title: "File type not supported", message: "Choose a supported file format." },
  FORBIDDEN: { severity: "error", title: "Access denied", message: "You do not have permission to complete this action." },
  PERMISSION_DENIED: { severity: "error", title: "Access denied", message: "You do not have permission to complete this action." },
  NOT_FOUND: { severity: "warning", title: "Not found", message: "The requested item could not be found." },
  CONFLICT: { severity: "warning", title: "Changes conflict", message: "This item has changed. Refresh and try again." },
  VALIDATION_ERROR: { severity: "warning", title: "Check the highlighted fields", message: "Some information needs your attention." },
  RATE_LIMITED: { severity: "warning", title: "Too many attempts", message: "Wait a moment before trying again.", retryable: true },
  SERVER_ERROR: { severity: "critical", title: "Service unavailable", message: "The service could not complete the request. Try again later.", retryable: true },
  BAD_GATEWAY: { severity: "critical", title: "Service unavailable", message: "The service is temporarily unavailable. Try again later.", retryable: true },
  SERVER_UNAVAILABLE: { severity: "critical", title: "Service unavailable", message: "The service is temporarily unavailable. Try again later.", retryable: true },
  GATEWAY_TIMEOUT: { severity: "critical", title: "Request timed out", message: "The service took too long to respond. Try again later.", retryable: true },
  NETWORK_ERROR: { severity: "error", title: "Connection problem", message: "Check your internet connection and try again.", retryable: true },
  NETWORK_UNAVAILABLE: { severity: "error", title: "Connection problem", message: "Check your internet connection and try again.", retryable: true },
  TIMEOUT: { severity: "error", title: "Request timed out", message: "The service took too long to respond. Try again.", retryable: true },
  REQUEST_CANCELLED: { severity: "warning", title: "Request cancelled", message: "The request was cancelled." },
  FILE_TOO_LARGE: { severity: "warning", title: "File is too large", message: "Choose a smaller file and try again." },
  UNSUPPORTED_FILE_TYPE: { severity: "warning", title: "File type not supported", message: "Choose a supported file format." },
  OUT_OF_STOCK: { severity: "warning", title: "Item unavailable", message: "This item is currently out of stock." },
  PAYMENT_FAILED: { severity: "error", title: "Payment unsuccessful", message: "Your payment could not be completed. Check the details and try again." },
  UNKNOWN_ERROR: { severity: "error", title: "Something went wrong", message: "We could not complete that action. Try again.", retryable: true }
});

const STATUS_CODES: Readonly<Record<number, string>> = Object.freeze({
  400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED", 408: "REQUEST_TIMEOUT", 409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE", 422: "VALIDATION_ERROR", 429: "RATE_LIMITED",
  500: "SERVER_ERROR", 502: "BAD_GATEWAY", 503: "SERVER_UNAVAILABLE", 504: "GATEWAY_TIMEOUT"
});

type ErrorShape = Record<string, unknown>;
let reporter: ErrorReporter | undefined;

function asShape(value: unknown): ErrorShape | undefined {
  return typeof value === "object" && value !== null ? value as ErrorShape : undefined;
}

function readString(shape: ErrorShape | undefined, ...keys: string[]): string | undefined {
  for (const key of keys) if (typeof shape?.[key] === "string") return shape[key] as string;
  return undefined;
}

function readStatus(shape: ErrorShape | undefined): number | undefined {
  const status = shape?.status ?? shape?.statusCode;
  return typeof status === "number" && Number.isInteger(status) ? status : undefined;
}

function validationErrors(shape: ErrorShape | undefined): ValidationFieldError[] | undefined {
  const source = shape?.fieldErrors ?? shape?.errors;
  if (Array.isArray(source)) {
    const result = source.flatMap((item) => {
      const entry = asShape(item);
      const field = readString(entry, "field", "path", "name");
      return field ? [{ field, message: safeFieldMessage(readString(entry, "message")) }] : [];
    });
    return result.length ? result : undefined;
  }
  const record = asShape(source);
  if (!record) return undefined;
  const result = Object.entries(record).map(([field, message]) => ({
    field,
    message: safeFieldMessage(typeof message === "string" ? message : undefined)
  }));
  return result.length ? result : undefined;
}

function safeFieldMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  if (/(?:bearer\s+|authorization|cookie|set-cookie|https?:\/\/|\btoken\b|password|stack|sql|database|select\s+.+\s+from)/i.test(message)) {
    return "Review this field.";
  }
  return message.slice(0, 240);
}

function referenceId(): string {
  const random = globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 0xffffffff);
  return `ERR-${Date.now().toString(36).toUpperCase()}-${random.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

function inferCode(error: unknown, shape: ErrorShape | undefined, status: number | undefined, context?: ErrorContext): string {
  const explicit = context?.code ?? readString(shape, "code", "errorCode")?.toUpperCase();
  if (explicit && ERROR_MESSAGE_MAP[explicit]) return explicit;
  if (shape?.isNetworkError === true || (error instanceof TypeError && /fetch|network/i.test(error.message))) return "NETWORK_ERROR";
  const name = readString(shape, "name");
  const technicalMessage = readString(shape, "message") ?? "";
  if (name === "AbortError" || /timed?\s*out|timeout/i.test(technicalMessage)) return "TIMEOUT";
  if (status !== undefined && status >= 500) return "SERVER_ERROR";
  return (status !== undefined && STATUS_CODES[status]) || "UNKNOWN_ERROR";
}

/** Converts any thrown value to safe, consistent user copy while retaining the original for diagnostics. */
export function normalizeError(error: unknown, context?: ErrorContext): NormalizedError {
  const shape = asShape(error);
  const status = readStatus(shape);
  const fieldErrors = validationErrors(shape);
  const inferred = inferCode(error, shape, status, context);
  const code = fieldErrors?.length && inferred === "UNKNOWN_ERROR" ? "VALIDATION_ERROR" : inferred;
  const copy = ERROR_MESSAGE_MAP[code] ?? ERROR_MESSAGE_MAP.UNKNOWN_ERROR;
  return {
    severity: copy.severity,
    userTitle: copy.title,
    userMessage: copy.message,
    code,
    status,
    referenceId: referenceId(),
    fieldErrors,
    technicalDetails: { error, context },
    retryable: copy.retryable ?? false
  };
}

export function configureErrorReporter(nextReporter?: ErrorReporter): void {
  reporter = nextReporter;
}

const SENSITIVE_KEY = /authorization|cookie|password|passcode|secret|token|endpoint|url|uri|operation|connectionstring|query|sql|database|stack/i;
const SENSITIVE_TEXT = /(?:bearer\s+|authorization|cookie|password|token|https?:\/\/|\b\/api\/|\bsql\b|\bdatabase\b|\bselect\b.+\bfrom\b|\binsert\s+into\b|\bupdate\b.+\bset\b|\bdelete\s+from\b)/i;

function sanitizeDiagnostic(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return SENSITIVE_TEXT.test(value) ? "[REDACTED]" : value.slice(0, 500);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (value instanceof Error) {
    return { name: value.name, message: sanitizeDiagnostic(value.message, "message") };
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeDiagnostic(item, "", seen));
  return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [
    entryKey,
    sanitizeDiagnostic(entryValue, entryKey, seen)
  ]));
}

/** Reports normalized diagnostics without exposing technical details as user-facing copy. */
export function reportError(error: unknown, context?: ErrorContext): NormalizedError {
  const normalized = normalizeError(error, context);
  if (import.meta.env.DEV) console.error(`[${normalized.referenceId}]`, normalized.technicalDetails);
  else if (reporter) {
    const sanitizedContext = sanitizeDiagnostic(context) as ErrorContext | undefined;
    void reporter({ ...normalized, technicalDetails: sanitizeDiagnostic(normalized.technicalDetails) }, sanitizedContext);
  }
  return normalized;
}
