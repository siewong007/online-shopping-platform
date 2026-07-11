export type NotificationSeverity = "info" | "success" | "warning" | "error" | "critical";

export type NotificationPresentation = "toast" | "banner" | "inline" | "modal" | "field";

export type NotificationScope = "global" | (string & {});

export type NotificationAction = {
  label: string;
  onAction: () => void | Promise<void>;
};

export type NotificationRetry = {
  label?: string;
  run: () => void | Promise<void>;
};

export type AppNotification = {
  id: string;
  severity: NotificationSeverity;
  presentation: NotificationPresentation;
  scope: NotificationScope;
  title: string;
  message: string;
  code?: string;
  details?: string;
  referenceId?: string;
  action?: NotificationAction;
  retry?: NotificationRetry;
  retrying?: boolean;
  dismissible: boolean;
  duration: number | null;
  timestamp: number;
  dedupeKey?: string;
  persistent: boolean;
  occurrenceCount: number;
};

export type NotificationInput = Omit<
  AppNotification,
  "id" | "timestamp" | "duration" | "persistent" | "occurrenceCount" | "presentation" | "scope" | "dismissible"
> & {
  id?: string;
  timestamp?: number;
  duration?: number | null;
  persistent?: boolean;
  presentation?: NotificationPresentation;
  scope?: NotificationScope;
  dismissible?: boolean;
};

export type ValidationFieldError = {
  field: string;
  message?: string;
};

export type NormalizedError = {
  severity: Extract<NotificationSeverity, "warning" | "error" | "critical">;
  userTitle: string;
  userMessage: string;
  code?: string;
  status?: number;
  referenceId: string;
  fieldErrors?: ValidationFieldError[];
  technicalDetails: unknown;
  retryable: boolean;
};

export type ErrorContext = {
  operation?: string;
  scope?: NotificationScope;
  code?: string;
  metadata?: Readonly<Record<string, unknown>>;
};

export type ErrorReporter = (error: NormalizedError, context?: ErrorContext) => void | Promise<void>;
