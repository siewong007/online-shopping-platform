import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { LanguageProvider } from "../../src/i18n/LanguageContext";
import { SupportChatWidget } from "../../src/modules/support/components/SupportChatWidget";

function renderWidget(isSuppressed = false): string {
  return renderToStaticMarkup(
    <LanguageProvider>
      <SupportChatWidget customerEmail="guest@example.com" isSuppressed={isSuppressed} />
    </LanguageProvider>
  );
}

describe("SupportChatWidget", () => {
  test("renders an accessible collapsed launcher for a guest", () => {
    const html = renderWidget();

    expect(html).toContain('class="support-chat-launcher"');
    expect(html).toContain('aria-controls="guest-support-chat"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Chat with support"');
    expect(html).toContain('<span aria-hidden="true" class="support-chat-launcher__icon">◌</span>');
    expect(html).toContain('<span>Chat with support</span>');
    expect(html).not.toContain('role="dialog"');
  });

  test("does not render while another guest portal surface suppresses chat", () => {
    expect(renderWidget(true)).toBe("");
  });
});
