import { SEVERITY_CONFIG } from "./config";
import type { AppNotification } from "./types";

export type NotificationBoxProps = {
  notification: AppNotification;
  onDismiss?: (id: string) => void;
  onRetry?: (id: string) => void | Promise<void>;
  showTimestamp?: boolean;
};

function SeverityIcon({ severity }: Pick<AppNotification, "severity">) {
  if (severity === "success") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>;
  }
  if (severity === "info") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 11v6m0-10h.01" /><circle cx="12" cy="12" r="9" /></svg>;
  }
  if (severity === "warning") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 8v5m0 4h.01M4 20h16L12 4 4 20Z" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 8 8 8m0-8-8 8" /><circle cx="12" cy="12" r="9" /></svg>;
}

/** Presentational notification shared by toast, banner, inline, and critical fallbacks. */
export function NotificationBox({ notification, onDismiss, onRetry, showTimestamp }: NotificationBoxProps) {
  const config = SEVERITY_CONFIG[notification.severity];
  const timestamp = new Date(notification.timestamp);
  const displayTimestamp = showTimestamp ?? notification.presentation !== "toast";

  return (
    <section
      aria-label={`${config.accessibleLabel}: ${notification.title}`}
      className={`notification-box notification-box--${notification.severity} notification-box--${notification.presentation}`}
      data-notification-id={notification.id}
      role={config.role}
    >
      <span className="notification-box__icon"><SeverityIcon severity={notification.severity} /></span>
      <div className="notification-box__content">
        <div className="notification-box__heading">
          <span className="notification-box__severity">{config.accessibleLabel}</span>
          {displayTimestamp ? <time dateTime={timestamp.toISOString()}>{timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> : null}
        </div>
        <strong className="notification-box__title">{notification.title}</strong>
        <p>{notification.message}</p>
        {notification.referenceId ? <p className="notification-box__reference">Reference ID: <code>{notification.referenceId}</code></p> : null}
        {notification.details ? <details><summary>More information</summary><p>{notification.details}</p></details> : null}
        {notification.occurrenceCount > 1 ? <span className="notification-box__count">Repeated {notification.occurrenceCount} times</span> : null}
        {notification.action || notification.retry ? (
          <div className="notification-box__actions">
            {notification.action ? <button onClick={() => void notification.action?.onAction()} type="button">{notification.action.label}</button> : null}
            {notification.retry ? (
              <button
                disabled={notification.retrying}
                onClick={() => void Promise.resolve(onRetry?.(notification.id)).catch(() => undefined)}
                type="button"
              >
                {notification.retrying ? "Retrying…" : (notification.retry.label ?? "Retry")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {notification.dismissible ? (
        <button aria-label={`Dismiss ${notification.title}`} className="notification-box__dismiss" onClick={() => onDismiss?.(notification.id)} type="button">
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </section>
  );
}
