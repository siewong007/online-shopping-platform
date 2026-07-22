import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import { useI18n } from "../../../i18n/LanguageContext";
import { fetchMe as fetchCustomerMe } from "../../customer_auth/api/customerAuthApi";
import {
  ApiError,
  getCustomerAuthToken,
  getSupportAuthToken,
  setSupportAuthToken
} from "../../../shared/api/http";
import {
  closeSupportConversation,
  createSupportConversation,
  fetchSupportConversation,
  fetchSupportMessages,
  sendSupportMessage
} from "../api/supportApi";
import type { SupportConversation, SupportMessage } from "../types";

const SUPPORT_PANEL_ID = "guest-support-chat";
const MAX_MESSAGE_LENGTH = 2_000;

type ChatLoadState = "idle" | "loading" | "ready" | "error" | "expired";

type SupportChatWidgetProps = {
  customerEmail: string;
  isSuppressed?: boolean;
};

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
}

function sortMessages(messages: SupportMessage[]): SupportMessage[] {
  return [...messages].sort((first, second) => first.id - second.id);
}

export function SupportChatWidget({ customerEmail, isSuppressed = false }: SupportChatWidgetProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadState, setLoadState] = useState<ChatLoadState>("idle");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState(customerEmail);
  const [guestOrderNumber, setGuestOrderNumber] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const guestNameRef = useRef<HTMLInputElement>(null);
  const guestEmailRef = useRef<HTMLInputElement>(null);
  const initialMessageRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<SupportMessage[]>([]);
  const latestMessageIdRef = useRef(0);
  const isOpenRef = useRef(false);
  const shouldFocusAfterOpenRef = useRef(false);
  const resumeAbortRef = useRef<AbortController | null>(null);
  const resumeInFlightRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const hasHydratedCollapsedPollRef = useRef(false);
  const mountedRef = useRef(true);

  const replaceMessages = useCallback((next: SupportMessage[]) => {
    const byId = new Map(next.map((message) => [message.id, message]));
    const ordered = sortMessages([...byId.values()]);
    messagesRef.current = ordered;
    latestMessageIdRef.current = ordered.at(-1)?.id ?? 0;
    setMessages(ordered);
  }, []);

  const appendMessages = useCallback((incoming: SupportMessage[], markCollapsedRepliesAsUnread = true) => {
    if (incoming.length === 0) {
      return;
    }

    const byId = new Map(messagesRef.current.map((message) => [message.id, message]));
    let receivedReplyWhileCollapsed = false;

    for (const message of incoming) {
      if (
        markCollapsedRepliesAsUnread &&
        !byId.has(message.id) &&
        message.author_kind === "admin" &&
        !isOpenRef.current
      ) {
        receivedReplyWhileCollapsed = true;
      }
      byId.set(message.id, message);
    }

    const ordered = sortMessages([...byId.values()]);
    messagesRef.current = ordered;
    latestMessageIdRef.current = ordered.at(-1)?.id ?? 0;
    setMessages(ordered);

    if (receivedReplyWhileCollapsed) {
      setHasUnread(true);
    }
  }, []);

  const recoverFromExpiredSession = useCallback(() => {
    setSupportAuthToken(null);
    hasHydratedCollapsedPollRef.current = false;
    setHasUnread(false);
    setConversation(null);
    replaceMessages([]);
    setLoadState("expired");
    setError(t("support.error.sessionExpired"));
  }, [replaceMessages, t]);

  const messageForError = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.isNetworkError) {
        return t("support.error.connection");
      }
      return caught instanceof ApiError ? caught.message : t("support.error.generic");
    },
    [t]
  );

  const loadExistingConversation = useCallback(async () => {
    if (!getSupportAuthToken()) {
      setConversation(null);
      replaceMessages([]);
      setLoadState("ready");
      setError("");
      return;
    }

    if (resumeInFlightRef.current) {
      return;
    }

    resumeInFlightRef.current = true;
    const controller = new AbortController();
    resumeAbortRef.current?.abort();
    resumeAbortRef.current = controller;
    setLoadState("loading");
    setError("");

    try {
      const [nextConversation, nextMessages] = await Promise.all([
        fetchSupportConversation(controller.signal),
        fetchSupportMessages(undefined, controller.signal)
      ]);

      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      setConversation(nextConversation);
      replaceMessages(nextMessages);
      setLoadState("ready");
    } catch (caught) {
      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      if (isUnauthorized(caught)) {
        recoverFromExpiredSession();
        return;
      }

      setLoadState("error");
      setError(messageForError(caught));
    } finally {
      if (resumeAbortRef.current === controller) {
        resumeAbortRef.current = null;
      }
      resumeInFlightRef.current = false;
    }
  }, [messageForError, recoverFromExpiredSession, replaceMessages]);

  const closePanel = useCallback(() => {
    isOpenRef.current = false;
    resumeAbortRef.current?.abort();
    setIsOpen(false);
    queueMicrotask(() => launcherRef.current?.focus());
  }, []);

  const togglePanel = () => {
    if (isOpen) {
      closePanel();
      return;
    }

    isOpenRef.current = true;
    shouldFocusAfterOpenRef.current = true;
    setHasUnread(false);
    setIsOpen(true);
    void loadExistingConversation();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      resumeAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!guestEmail && customerEmail) {
      setGuestEmail(customerEmail);
    }
  }, [customerEmail, guestEmail]);

  useEffect(() => {
    if (!isSuppressed || !isOpen) {
      return;
    }

    closePanel();
  }, [closePanel, isOpen, isSuppressed]);

  useEffect(() => {
    if (!isOpen || !getCustomerAuthToken()) {
      return;
    }

    let cancelled = false;

    void fetchCustomerMe()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setGuestEmail((current) => current || payload.account.email);
        setGuestName((current) => current || payload.account.display_name);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loadState !== "ready" || !shouldFocusAfterOpenRef.current) {
      return;
    }

    shouldFocusAfterOpenRef.current = false;
    queueMicrotask(() => {
      if (conversation) {
        composerRef.current?.focus();
      } else if (!guestName.trim()) {
        guestNameRef.current?.focus();
      } else if (!guestEmail.trim()) {
        guestEmailRef.current?.focus();
      } else {
        initialMessageRef.current?.focus();
      }
    });
  }, [conversation, guestEmail, guestName, isOpen, loadState]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel, isOpen]);

  const pollMessages = useCallback(
    async (signal: AbortSignal, markCollapsedRepliesAsUnread = true): Promise<boolean> => {
      if (pollInFlightRef.current || !getSupportAuthToken()) {
        return false;
      }

      pollInFlightRef.current = true;

      try {
        const incoming = await fetchSupportMessages(latestMessageIdRef.current || undefined, signal);
        if (!signal.aborted && mountedRef.current) {
          appendMessages(incoming, markCollapsedRepliesAsUnread);
          return true;
        }
      } catch (caught) {
        if (signal.aborted || !mountedRef.current) {
          return false;
        }

        if (isUnauthorized(caught)) {
          recoverFromExpiredSession();
          return false;
        }

        setError(messageForError(caught));
        return false;
      } finally {
        pollInFlightRef.current = false;
      }

      return false;
    },
    [appendMessages, messageForError, recoverFromExpiredSession]
  );

  useEffect(() => {
    if (!isOpen || !conversation) {
      return;
    }

    const controller = new AbortController();
    const poll = () => {
      if (document.visibilityState === "visible") {
        void pollMessages(controller.signal);
      }
    };
    const onVisibilityChange = () => poll();

    poll();
    const interval = window.setInterval(poll, 5_000);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller.abort();
    };
  }, [conversation, isOpen, pollMessages]);

  useEffect(() => {
    if (isOpen || !getSupportAuthToken()) {
      return;
    }

    const controller = new AbortController();
    const poll = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const shouldHydrate = !hasHydratedCollapsedPollRef.current;
      void pollMessages(controller.signal, !shouldHydrate).then((didPoll) => {
        if (didPoll && shouldHydrate) {
          hasHydratedCollapsedPollRef.current = true;
        }
      });
    };
    const onVisibilityChange = () => poll();

    poll();
    const interval = window.setInterval(poll, 15_000);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller.abort();
    };
  }, [isOpen, pollMessages]);

  const startConversation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = guestName.trim();
    const email = guestEmail.trim().toLowerCase();
    const message = initialMessage.trim();
    const orderNumber = guestOrderNumber.trim();

    if (!name || !email || !message) {
      setError(t("support.error.required"));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t("support.error.email"));
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const response = await createSupportConversation({
        guest_name: name,
        guest_email: email,
        message: orderNumber ? `Guest order #${orderNumber}\n\n${message}` : message
      });

      if (!mountedRef.current) {
        return;
      }

      setSupportAuthToken(response.token);
      hasHydratedCollapsedPollRef.current = false;
      setConversation(response.conversation);
      replaceMessages(response.messages);
      setInitialMessage("");
      setDraft("");
      setLoadState("ready");
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }
      setError(messageForError(caught));
    } finally {
      if (mountedRef.current) {
        setIsStarting(false);
      }
    }
  };

  const sendMessage = async () => {
    const body = draft.trim();

    if (!body) {
      setError(t("support.error.required"));
      return;
    }

    if (conversation?.status === "closed") {
      setError(t("support.closed"));
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const message = await sendSupportMessage(body);
      if (!mountedRef.current) {
        return;
      }
      appendMessages([message]);
      setDraft("");
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }
      if (isUnauthorized(caught)) {
        recoverFromExpiredSession();
        return;
      }
      setError(messageForError(caught));
    } finally {
      if (mountedRef.current) {
        setIsSending(false);
      }
    }
  };

  const closeConversation = async () => {
    if (!conversation || conversation.status === "closed") {
      return;
    }

    setIsClosing(true);
    setError("");

    try {
      const updated = await closeSupportConversation();
      if (mountedRef.current) {
        setConversation(updated);
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }
      if (isUnauthorized(caught)) {
        recoverFromExpiredSession();
        return;
      }
      setError(messageForError(caught));
    } finally {
      if (mountedRef.current) {
        setIsClosing(false);
      }
    }
  };

  const retry = () => {
    if (getSupportAuthToken()) {
      void loadExistingConversation();
      return;
    }

    setError("");
    setLoadState("ready");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  if (isSuppressed) {
    return null;
  }

  const isConversationClosed = conversation?.status === "closed";
  const launcherLabel = isOpen ? t("support.closePanel") : t("support.launcher");

  return (
    <div className={`support-chat-widget ${isOpen ? "support-chat-widget--open" : ""}`}>
      {isOpen ? (
        <section
          aria-describedby={`${SUPPORT_PANEL_ID}-description`}
          aria-labelledby={`${SUPPORT_PANEL_ID}-title`}
          className="support-chat-panel"
          id={SUPPORT_PANEL_ID}
          role="dialog"
        >
          <header className="support-chat-panel__header">
            <div>
              <p className="support-chat-panel__eyebrow">{t("support.eyebrow")}</p>
              <h2 id={`${SUPPORT_PANEL_ID}-title`}>{t("support.title")}</h2>
              <p id={`${SUPPORT_PANEL_ID}-description`}>{t("support.instructions")}</p>
            </div>
            <button
              aria-label={t("support.closePanel")}
              className="support-chat-panel__close"
              onClick={closePanel}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          {error ? (
            <div className="support-chat-error" role="alert">
              <p>{error}</p>
              {loadState === "error" ? (
                <button onClick={retry} type="button">
                  {t("support.retry")}
                </button>
              ) : null}
            </div>
          ) : null}

          {loadState === "loading" ? (
            <div className="support-chat-empty" role="status">
              {t("support.loading")}
            </div>
          ) : conversation ? (
            <>
              <div className="support-chat-status-row">
                <span className={`support-chat-status support-chat-status--${conversation.status}`}>
                  {t(`support.status.${conversation.status}`)}
                </span>
                {conversation.status !== "closed" ? (
                  <button
                    className="support-chat-close-conversation"
                    disabled={isClosing}
                    onClick={() => void closeConversation()}
                    type="button"
                  >
                    {isClosing ? t("support.closing") : t("support.closeConversation")}
                  </button>
                ) : null}
              </div>

              <ol aria-live="polite" className="support-chat-thread" aria-label={t("support.thread")}>
                {messages.map((message) => (
                  <li
                    className={`support-chat-message support-chat-message--${message.author_kind}`}
                    key={message.id}
                  >
                    <div className="support-chat-message__meta">
                      <strong>{message.author_kind === "guest" ? t("support.you") : t("support.team")}</strong>
                      <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                    </div>
                    <p>{message.body}</p>
                  </li>
                ))}
              </ol>

              {isConversationClosed ? (
                <p className="support-chat-closed-note">{t("support.closed")}</p>
              ) : (
                <div className="support-chat-composer">
                  <label htmlFor="support-chat-message">{t("support.message")}</label>
                  <textarea
                    aria-describedby="support-chat-message-hint"
                    disabled={isSending}
                    id="support-chat-message"
                    maxLength={MAX_MESSAGE_LENGTH}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={t("support.messagePlaceholder")}
                    ref={composerRef}
                    rows={3}
                    value={draft}
                  />
                  <div className="support-chat-composer__actions">
                    <span id="support-chat-message-hint">{t("support.sendHint")}</span>
                    <button disabled={isSending || !draft.trim()} onClick={() => void sendMessage()} type="button">
                      {isSending ? t("support.sending") : t("support.send")}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form className="support-chat-start-form" onSubmit={startConversation}>
              {loadState === "expired" ? <p className="support-chat-expired">{t("support.newConversation")}</p> : null}
              <p className="support-chat-welcome">{t("support.welcome")}</p>
              <fieldset className="support-chat-details">
                <legend>Guest details</legend>
                <label>
                  <span>{t("support.name")}</span>
                  <input
                    autoComplete="name"
                    disabled={isStarting}
                    onChange={(event) => setGuestName(event.target.value)}
                    ref={guestNameRef}
                    required
                    value={guestName}
                  />
                </label>
                <label>
                  <span>{t("support.email")}</span>
                  <input
                    autoComplete="email"
                    disabled={isStarting}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    ref={guestEmailRef}
                    required
                    type="email"
                    value={guestEmail}
                  />
                </label>
              </fieldset>
              <fieldset className="support-chat-details">
                <legend>Guest order lookup</legend>
                <label>
                  <span>Order number (optional)</span>
                  <input
                    disabled={isStarting}
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => setGuestOrderNumber(event.target.value)}
                    placeholder="e.g. 1024"
                    type="number"
                    value={guestOrderNumber}
                  />
                </label>
                <p>Enter an order number and our support team will look into it in this chat.</p>
              </fieldset>
              <label>
                <span>{t("support.firstMessage")}</span>
                <textarea
                  disabled={isStarting}
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(event) => setInitialMessage(event.target.value)}
                  placeholder={t("support.firstMessagePlaceholder")}
                  ref={initialMessageRef}
                  required
                  rows={4}
                  value={initialMessage}
                />
              </label>
              <button className="support-chat-start-form__submit" disabled={isStarting} type="submit">
                {isStarting ? t("support.starting") : t("support.start")}
              </button>
            </form>
          )}
        </section>
      ) : null}

      <button
        aria-controls={SUPPORT_PANEL_ID}
        aria-expanded={isOpen}
        aria-label={launcherLabel}
        className="support-chat-launcher"
        onClick={togglePanel}
        ref={launcherRef}
        type="button"
      >
        <span aria-hidden="true" className="support-chat-launcher__icon">◌</span>
        <span>{t("support.launcher")}</span>
        {hasUnread ? <span aria-label={t("support.unread")} className="support-chat-launcher__badge" /> : null}
      </button>
    </div>
  );
}
