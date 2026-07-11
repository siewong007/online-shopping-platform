import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationBox } from "../../src/shared/notifications/NotificationBox";
import type { AppNotification, NotificationSeverity } from "../../src/shared/notifications/types";

function notification(severity: NotificationSeverity, extra: Partial<AppNotification> = {}): AppNotification {
  return {
    id: `id-${severity}`,
    severity,
    presentation: "toast",
    scope: "global",
    title: `${severity} title`,
    message: `${severity} message`,
    dismissible: true,
    duration: 5_000,
    timestamp: Date.UTC(2026, 6, 10, 12),
    persistent: false,
    occurrenceCount: 1,
    ...extra
  };
}

describe("NotificationBox", () => {
  test.each([
    ["info", "status", "Information"],
    ["success", "status", "Success"],
    ["warning", "alert", "Warning"],
    ["error", "alert", "Error"],
    ["critical", "alert", "Critical error"]
  ] as const)("renders %s with its role and visible severity label", (severity, role, label) => {
    const html = renderToStaticMarkup(<NotificationBox notification={notification(severity)} />);
    expect(html).toContain(`role="${role}"`);
    expect(html).toContain(`aria-label="${label}: ${severity} title"`);
    expect(html).toContain(`>${label}</span>`);
    expect(html).toContain(`notification-box--${severity}`);
    expect(html).toContain("aria-hidden=\"true\"");
  });

  test("renders safe supporting content, actions, retry, dismiss, and repetition", () => {
    const html = renderToStaticMarkup(
      <NotificationBox
        notification={notification("error", {
          presentation: "inline",
          referenceId: "ERR-SAFE-123",
          details: "Your draft remains available.",
          action: { label: "Open draft", onAction: () => undefined },
          retry: { label: "Try save again", run: () => undefined },
          occurrenceCount: 3
        })}
      />
    );
    expect(html).toContain("Reference ID:");
    expect(html).toContain("ERR-SAFE-123");
    expect(html).toContain("More information");
    expect(html).toContain("Your draft remains available.");
    expect(html).toContain("Open draft");
    expect(html).toContain("Try save again");
    expect(html).toContain("Repeated 3 times");
    expect(html).toContain("aria-label=\"Dismiss error title\"");
  });

  test("hides dismiss control when a notification is not dismissible", () => {
    const html = renderToStaticMarkup(<NotificationBox notification={notification("critical", { dismissible: false })} />);
    expect(html).not.toContain("Dismiss critical title");
  });
});
