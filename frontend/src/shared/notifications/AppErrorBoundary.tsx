import { Component, type ErrorInfo, type ReactNode } from "react";
import { useNotifications, type NotificationErrorOptions } from "./NotificationProvider";

type BoundaryState = { failed: boolean };

type BoundaryProps = {
  children: ReactNode;
  notifyError: (error: unknown, options?: NotificationErrorOptions) => string;
};

class NotificationErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.notifyError(error, {
      operation: "react-render",
      metadata: { componentStack: info.componentStack ?? "unavailable" },
      presentation: "banner",
      scope: "global",
      persistent: true,
      dedupeKey: "react-error-boundary"
    });
  }

  private tryAgain = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main aria-labelledby="application-error-title" className="notification-critical-fallback" role="alert">
        <span aria-hidden="true" className="notification-critical-fallback__icon">!</span>
        <div>
          <p className="notification-box__severity">Critical error</p>
          <h1 id="application-error-title">This page could not be displayed</h1>
          <p>Your work may not have been completed. Try the page again, or reload the application.</p>
          <div className="notification-box__actions">
            <button onClick={this.tryAgain} type="button">Try again</button>
            <button onClick={() => globalThis.location?.reload()} type="button">Reload</button>
          </div>
        </div>
      </main>
    );
  }
}

/** Hook-aware wrapper that reports render failures and provides a safe recovery screen. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications();
  return <NotificationErrorBoundary notifyError={notifyError}>{children}</NotificationErrorBoundary>;
}
