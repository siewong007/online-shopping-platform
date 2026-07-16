import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../../../shared/api/http";
import {
  fetchAdminSupportConversationThread,
  fetchAdminSupportConversations,
  sendAdminSupportMessage,
  updateAdminSupportConversation
} from "../api/supportApi";
import type {
  SupportAdminConversationThread,
  SupportConversation,
  SupportConversationStatus,
  SupportInboxConversation,
  SupportMessage
} from "../types";

const MAX_MESSAGE_LENGTH = 2_000;

type ListLoadMode = "initial" | "refresh";

type SupportInboxPanelProps = {
  canUpdate: boolean;
  currentAdminUserId: number | null;
};

function sortConversations(conversations: SupportInboxConversation[]): SupportInboxConversation[] {
  return [...conversations].sort((first, second) => {
    const firstTime = Date.parse(first.last_message_at ?? first.updated_at) || 0;
    const secondTime = Date.parse(second.last_message_at ?? second.updated_at) || 0;
    return secondTime - firstTime;
  });
}

function mergeConversations(
  current: SupportInboxConversation[],
  incoming: SupportInboxConversation[]
): SupportInboxConversation[] {
  const byId = new Map(current.map((conversation) => [conversation.id, conversation]));

  for (const conversation of incoming) {
    byId.set(conversation.id, { ...byId.get(conversation.id), ...conversation });
  }

  return sortConversations([...byId.values()]);
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "No activity yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Support could not be loaded. Try again.";
}

function statusLabel(status: SupportConversationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function appendThreadMessage(thread: SupportAdminConversationThread, message: SupportMessage): SupportAdminConversationThread {
  if (thread.messages.some((item) => item.id === message.id)) {
    return thread;
  }

  return {
    ...thread,
    messages: [...thread.messages, message].sort((first, second) => first.id - second.id)
  };
}

export function SupportInboxPanel({ canUpdate, currentAdminUserId }: SupportInboxPanelProps) {
  const [status, setStatus] = useState<SupportConversationStatus>("open");
  const [conversations, setConversations] = useState<SupportInboxConversation[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [thread, setThread] = useState<SupportAdminConversationThread | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [updatingConversationId, setUpdatingConversationId] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const selectedConversationIdRef = useRef<number | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);
  const threadAbortRef = useRef<AbortController | null>(null);
  const listInFlightRef = useRef(false);
  const loadMoreInFlightRef = useRef(false);
  const threadInFlightRef = useRef(false);
  const nextCursorRef = useRef<number | null>(null);
  const hasLoadedOlderPagesRef = useRef(false);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listAbortRef.current?.abort();
      threadAbortRef.current?.abort();
    };
  }, []);

  const setPaginationCursor = useCallback((cursor: number | null) => {
    nextCursorRef.current = cursor;
    setNextCursor(cursor);
  }, []);

  const loadList = useCallback(
    async (mode: ListLoadMode = "refresh", replaceExistingRequest = false) => {
      if (listInFlightRef.current && !replaceExistingRequest) {
        return;
      }

      if (listInFlightRef.current) {
        listAbortRef.current?.abort();
      }

      const controller = new AbortController();
      listAbortRef.current = controller;
      listInFlightRef.current = true;

      if (mode === "initial") {
        setIsListLoading(true);
        setLoadMoreError("");
        hasLoadedOlderPagesRef.current = false;
        setPaginationCursor(null);
      }

      try {
        const page = await fetchAdminSupportConversations({ limit: 50, status }, controller.signal);
        if (controller.signal.aborted || !mountedRef.current) {
          return;
        }

        if (mode === "initial") {
          const next = sortConversations(page.items);
          setConversations(next);
          setPaginationCursor(page.next_cursor);
          setSelectedConversationId((current) =>
            current !== null && next.some((conversation) => conversation.id === current)
              ? current
              : next[0]?.id ?? null
          );
        } else {
          setConversations((current) => mergeConversations(current, page.items));
          if (!hasLoadedOlderPagesRef.current) {
            setPaginationCursor(page.next_cursor);
          }
        }
        setListError("");
      } catch (error) {
        if (!controller.signal.aborted && mountedRef.current) {
          setListError(errorText(error));
        }
      } finally {
        if (listAbortRef.current === controller) {
          listAbortRef.current = null;
          listInFlightRef.current = false;
          if (mountedRef.current) {
            setIsListLoading(false);
          }
        }
      }
    },
    [setPaginationCursor, status]
  );

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (cursor === null || listInFlightRef.current || loadMoreInFlightRef.current) {
      return;
    }

    const controller = new AbortController();
    listAbortRef.current = controller;
    listInFlightRef.current = true;
    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError("");

    try {
      const page = await fetchAdminSupportConversations({ before: cursor, limit: 50, status }, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      hasLoadedOlderPagesRef.current = true;
      setConversations((current) => mergeConversations(current, page.items));
      setPaginationCursor(page.next_cursor);
      setListError("");
    } catch (error) {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoadMoreError(errorText(error));
      }
    } finally {
      loadMoreInFlightRef.current = false;
      if (listAbortRef.current === controller) {
        listAbortRef.current = null;
        listInFlightRef.current = false;
      }
      if (mountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [setPaginationCursor, status]);

  const loadThread = useCallback(
    async (conversationId: number, showLoading = false, replaceExistingRequest = false) => {
      if (threadInFlightRef.current && !replaceExistingRequest) {
        return;
      }

      if (threadInFlightRef.current) {
        threadAbortRef.current?.abort();
      }

      const controller = new AbortController();
      threadAbortRef.current = controller;
      threadInFlightRef.current = true;

      if (showLoading) {
        setIsThreadLoading(true);
      }

      try {
        const next = await fetchAdminSupportConversationThread(conversationId, controller.signal);
        if (
          controller.signal.aborted ||
          !mountedRef.current ||
          selectedConversationIdRef.current !== conversationId
        ) {
          return;
        }

        setThread({ ...next, messages: [...next.messages].sort((first, second) => first.id - second.id) });
        setThreadError("");
      } catch (error) {
        if (!controller.signal.aborted && mountedRef.current) {
          setThreadError(errorText(error));
        }
      } finally {
        if (threadAbortRef.current === controller) {
          threadAbortRef.current = null;
          threadInFlightRef.current = false;
          if (mountedRef.current) {
            setIsThreadLoading(false);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    if (document.visibilityState === "visible") {
      void loadList("initial", true);
    }
  }, [loadList]);

  useEffect(() => {
    setReplyDraft("");
    setThreadError("");
    setThread((current) =>
      current?.conversation.id === selectedConversationId ? current : null
    );

    if (selectedConversationId === null) {
      return;
    }

    if (document.visibilityState === "visible") {
      void loadThread(selectedConversationId, true, true);
    }
  }, [loadThread, selectedConversationId]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadList();
      const conversationId = selectedConversationIdRef.current;
      if (conversationId !== null) {
        void loadThread(conversationId);
      }
    };
    const onVisibilityChange = () => poll();

    const interval = window.setInterval(poll, 5_000);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadList, loadThread]);

  const changeFilterStatus = (nextStatus: SupportConversationStatus) => {
    if (nextStatus === status) {
      return;
    }

    listAbortRef.current?.abort();
    threadAbortRef.current?.abort();
    hasLoadedOlderPagesRef.current = false;
    setPaginationCursor(null);
    setConversations([]);
    setListError("");
    setLoadMoreError("");
    selectedConversationIdRef.current = null;
    setSelectedConversationId(null);
    setStatus(nextStatus);
  };

  const updateConversationLocally = useCallback((updated: SupportConversation) => {
    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === updated.id ? { ...conversation, ...updated } : conversation
        )
      )
    );
    setThread((current) =>
      current?.conversation.id === updated.id ? { ...current, conversation: updated } : current
    );
  }, []);

  const changeStatus = async (nextStatus: SupportConversationStatus) => {
    const conversationId = selectedConversationId;
    if (!canUpdate || conversationId === null) {
      return;
    }

    setUpdatingConversationId(conversationId);
    setThreadError("");

    try {
      const updated = await updateAdminSupportConversation(conversationId, { status: nextStatus });
      if (mountedRef.current) {
        updateConversationLocally(updated);
      }
    } catch (error) {
      if (mountedRef.current && selectedConversationIdRef.current === conversationId) {
        setThreadError(errorText(error));
      }
    } finally {
      if (mountedRef.current) {
        setUpdatingConversationId((current) => current === conversationId ? null : current);
      }
    }
  };

  const assignToMe = async () => {
    const conversationId = selectedConversationId;
    if (!canUpdate || conversationId === null || currentAdminUserId === null) {
      return;
    }

    setUpdatingConversationId(conversationId);
    setThreadError("");

    try {
      const updated = await updateAdminSupportConversation(conversationId, {
        assigned_admin_user_id: currentAdminUserId
      });
      if (mountedRef.current) {
        updateConversationLocally(updated);
      }
    } catch (error) {
      if (mountedRef.current && selectedConversationIdRef.current === conversationId) {
        setThreadError(errorText(error));
      }
    } finally {
      if (mountedRef.current) {
        setUpdatingConversationId((current) => current === conversationId ? null : current);
      }
    }
  };

  const sendReply = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const body = replyDraft.trim();
    const conversationId = selectedConversationId;
    if (!canUpdate || conversationId === null || !body) {
      return;
    }

    setIsReplying(true);
    setThreadError("");

    try {
      const message = await sendAdminSupportMessage(conversationId, body);
      if (!mountedRef.current || selectedConversationIdRef.current !== conversationId) {
        return;
      }

      setThread((current) =>
        current?.conversation.id === conversationId ? appendThreadMessage(current, message) : current
      );
      setReplyDraft("");
      void loadList("refresh", true);
    } catch (error) {
      if (mountedRef.current && selectedConversationIdRef.current === conversationId) {
        setThreadError(errorText(error));
      }
    } finally {
      if (mountedRef.current) {
        setIsReplying(false);
      }
    }
  };

  const handleReplyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendReply();
    }
  };

  const selectedThread = thread?.conversation.id === selectedConversationId ? thread : null;
  const selectedConversation = selectedThread?.conversation ?? conversations.find(
    (conversation) => conversation.id === selectedConversationId
  ) ?? null;

  return (
    <section aria-labelledby="support-inbox-title" className="admin-section active support-inbox">
      <header className="support-inbox__header">
        <div>
          <p className="eyebrow">Customer care</p>
          <h3 id="support-inbox-title">Support inbox</h3>
          <p>Guest conversations are shown by their latest activity.</p>
        </div>
        <label className="support-inbox__filter">
          <span>Status</span>
          <select
            onChange={(event) => changeFilterStatus(event.target.value as SupportConversationStatus)}
            value={status}
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </header>

      <div className="support-inbox__layout">
        <aside aria-label="Support conversations" className="support-inbox__queue">
          {listError ? (
            <div className="support-inbox__error" role="alert">
              <p>{listError}</p>
              <button onClick={() => void loadList("initial", true)} type="button">Try again</button>
            </div>
          ) : null}

          {isListLoading && conversations.length === 0 ? <p className="table-muted">Loading conversations…</p> : null}
          {!isListLoading && conversations.length === 0 && !listError ? (
            <p className="table-muted">No {status} conversations.</p>
          ) : null}

          <div className="support-inbox__queue-list">
            {conversations.map((conversation) => (
              <button
                aria-current={conversation.id === selectedConversationId ? "page" : undefined}
                className={`support-inbox__queue-item ${conversation.id === selectedConversationId ? "is-selected" : ""}`}
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                type="button"
              >
                <span className="support-inbox__queue-topline">
                  <strong>{conversation.guest_name}</strong>
                  <time dateTime={conversation.last_message_at ?? conversation.updated_at}>
                    {formatTimestamp(conversation.last_message_at ?? conversation.updated_at)}
                  </time>
                </span>
                <span>{conversation.guest_email}</span>
                <span className="support-inbox__queue-preview">
                  {conversation.last_message_preview || "No message preview"}
                </span>
                <span className={`support-inbox__status support-inbox__status--${conversation.status}`}>
                  {statusLabel(conversation.status)}
                </span>
              </button>
            ))}
          </div>

          {loadMoreError ? (
            <div className="support-inbox__error" role="alert">
              <p>{loadMoreError}</p>
              <button onClick={() => void loadMore()} type="button">Try again</button>
            </div>
          ) : null}

          {nextCursor !== null ? (
            <button
              aria-label="Load older support conversations"
              className="support-inbox__load-more"
              disabled={isListLoading || isLoadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {isLoadingMore ? "Loading more conversations…" : "Load more conversations"}
            </button>
          ) : null}
        </aside>

        <article className="support-inbox__thread">
          {selectedConversation === null ? (
            <div className="support-inbox__empty">
              <h4>Select a conversation</h4>
              <p>Choose a guest conversation to see its messages and respond.</p>
            </div>
          ) : (
            <>
              <header className="support-inbox__thread-header">
                <div>
                  <p className="eyebrow">Guest conversation</p>
                  <h4>{selectedConversation.guest_name}</h4>
                  <a href={`mailto:${selectedConversation.guest_email}`}>{selectedConversation.guest_email}</a>
                  <p>
                    {selectedConversation.assigned_admin_display_name
                      ? `Assigned to ${selectedConversation.assigned_admin_display_name}`
                      : "Unassigned"}
                  </p>
                </div>
                <div className="support-inbox__thread-actions">
                  <button
                    disabled={
                      !canUpdate ||
                      currentAdminUserId === null ||
                      selectedConversation.assigned_admin_user_id === currentAdminUserId ||
                      updatingConversationId === selectedConversation.id
                    }
                    onClick={() => void assignToMe()}
                    type="button"
                  >
                    {selectedConversation.assigned_admin_user_id === currentAdminUserId ? "Assigned to me" : "Assign to me"}
                  </button>
                  {(["open", "pending", "closed"] as SupportConversationStatus[]).map((nextStatus) => (
                    <button
                      className={selectedConversation.status === nextStatus ? "is-active" : ""}
                      disabled={
                        !canUpdate ||
                        selectedConversation.status === nextStatus ||
                        updatingConversationId === selectedConversation.id
                      }
                      key={nextStatus}
                      onClick={() => void changeStatus(nextStatus)}
                      type="button"
                    >
                      {statusLabel(nextStatus)}
                    </button>
                  ))}
                </div>
              </header>

              {threadError ? (
                <div className="support-inbox__error" role="alert">
                  <p>{threadError}</p>
                  <button onClick={() => void loadThread(selectedConversation.id, true, true)} type="button">
                    Try again
                  </button>
                </div>
              ) : null}

              {isThreadLoading && thread === null ? <p className="table-muted">Loading messages…</p> : null}
              <ol aria-live="polite" className="support-inbox__messages" aria-label="Conversation messages">
                {(selectedThread?.messages ?? []).map((message) => (
                  <li className={`support-inbox__message support-inbox__message--${message.author_kind}`} key={message.id}>
                    <div>
                      <strong>{message.author_kind === "guest" ? selectedConversation.guest_name : "Admin"}</strong>
                      <time dateTime={message.created_at}>{formatTimestamp(message.created_at)}</time>
                    </div>
                    <p>{message.body}</p>
                  </li>
                ))}
              </ol>

              <form className="support-inbox__reply" onSubmit={sendReply}>
                <label htmlFor="support-inbox-reply">Reply</label>
                <textarea
                  disabled={!canUpdate || isReplying || selectedConversation.status === "closed"}
                  id="support-inbox-reply"
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder={selectedConversation.status === "closed" ? "Reopen this conversation to reply." : "Write a reply…"}
                  rows={3}
                  value={replyDraft}
                />
                <div>
                  <span>Enter sends · Shift+Enter adds a new line</span>
                  <button
                    className="solid-button"
                    disabled={
                      !canUpdate ||
                      isReplying ||
                      selectedConversation.status === "closed" ||
                      !replyDraft.trim()
                    }
                    type="submit"
                  >
                    {isReplying ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </form>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
