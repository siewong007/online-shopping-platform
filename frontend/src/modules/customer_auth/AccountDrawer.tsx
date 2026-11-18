import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { fulfillmentLabel } from "../../app/utils";
import { intlLocaleFor, useI18n } from "../../i18n/LanguageContext";
import {
  fetchCustomerMe,
  fetchCustomerPortalBenefits,
  fetchCustomerPortalMembership,
  fetchCustomerPortalTransactions,
  fetchCustomerSessions,
  loginCustomer,
  logoutCustomer,
  logoutCustomerOtherSessions,
  logoutCustomerSession,
  registerCustomer
} from "../../lib/api";
import { ApiError, getCustomerAuthToken, setCustomerAuthToken } from "../../shared/api/http";
import { TurnstileSlot, useTurnstile } from "../../shared/components/TurnstileSlot";
import { currencyFromCents, formatRelativeTime } from "../../shared/formatters";
import { normalizeError } from "../../shared/notifications";
import type {
  CustomerLoginInput,
  CustomerMePayload,
  CustomerRegisterInput,
  CustomerSession,
  CustomerTransactionsPayload,
  FulfillmentStatus,
  MembershipBenefitsPayload,
  MembershipPayload
} from "../../types";
import type { PublicOffersPayload } from "../offers/types";

type AccountDrawerProps = {
  open: boolean;
  customerAccountEmail: string;
  onApplyVoucher?: (code: string) => void;
  onAuthenticated: (email: string) => void;
  onClose: () => void;
  onLoggedOut?: () => void;
  publicOffers?: PublicOffersPayload | null;
};

type AccountAuthView = "login" | "register";
type AccountPortalTab = "transactions" | "membership" | "benefits" | "sessions";
type PortalLoadStatus = "idle" | "loading" | "success" | "not-found" | "error";

const PORTAL_TRANSACTIONS_PAGE_SIZE = 20;
const PORTAL_TABS: AccountPortalTab[] = ["transactions", "membership", "benefits", "sessions"];
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const emptyCustomerAuthForm: CustomerRegisterInput = {
  email: "",
  password: "",
  display_name: ""
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.closest('[hidden], [aria-hidden="true"]')) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function parseTimestamp(value: string): Date | null {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue.replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAccountDate(value: string, locale: string): string {
  const date = parseTimestamp(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatRelativeTimeLocalized(value: string, locale: string): string {
  const date = parseTimestamp(value);
  if (!date) {
    return value;
  }

  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    if (Math.abs(diffMinutes) < 1) {
      return rtf.format(0, "second");
    }
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(-diffMinutes, "minute");
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(-diffHours, "hour");
    }
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(-diffDays, "day");
  } catch {
    return formatRelativeTime(value);
  }
}

function customerSessionDeviceLabel(userAgent: string | null, unknownDeviceLabel: string): string {
  if (!userAgent) return unknownDeviceLabel;

  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const platform =
    userAgent.includes("iPhone") || userAgent.includes("iPad")
      ? "iOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Windows")
            ? "Windows"
            : userAgent.includes("Linux")
              ? "Linux"
              : "";

  return platform ? `${browser} on ${platform}` : browser;
}

export function AccountDrawer({
  open,
  customerAccountEmail,
  onApplyVoucher,
  onAuthenticated,
  onClose,
  onLoggedOut,
  publicOffers
}: AccountDrawerProps) {
  const { lang, t } = useI18n();
  const locale = intlLocaleFor(lang);
  const baseId = useId();

  const [session, setSession] = useState<CustomerMePayload | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "restoring" | "failed">("idle");
  const [authView, setAuthView] = useState<AccountAuthView>("login");
  const [authForm, setAuthForm] = useState<CustomerRegisterInput>(emptyCustomerAuthForm);
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "error">("idle");
  const [authError, setAuthError] = useState("");

  const [portalTab, setPortalTab] = useState<AccountPortalTab>("transactions");

  const [membership, setMembership] = useState<MembershipPayload | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<PortalLoadStatus>("idle");
  const [membershipRetry, setMembershipRetry] = useState(0);

  const [benefits, setBenefits] = useState<MembershipBenefitsPayload | null>(null);
  const [benefitsStatus, setBenefitsStatus] = useState<PortalLoadStatus>("idle");
  const [benefitsRetry, setBenefitsRetry] = useState(0);

  const [transactions, setTransactions] = useState<CustomerTransactionsPayload | null>(null);
  const [transactionsStatus, setTransactionsStatus] = useState<PortalLoadStatus>("idle");
  const [transactionsOffset, setTransactionsOffset] = useState(0);
  const [transactionsRetry, setTransactionsRetry] = useState(0);

  const [customerSessions, setCustomerSessions] = useState<CustomerSession[]>([]);
  const [customerSessionsStatus, setCustomerSessionsStatus] = useState<PortalLoadStatus>("idle");
  const [customerSessionsError, setCustomerSessionsError] = useState("");
  const [sessionsRetry, setSessionsRetry] = useState(0);
  const [sessionActionId, setSessionActionId] = useState<number | "others" | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

  const drawerRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const tabRefs = useRef<Record<AccountPortalTab, HTMLButtonElement | null>>({
    transactions: null,
    membership: null,
    benefits: null,
    sessions: null
  });
  const copyTimeoutRef = useRef<number | null>(null);
  const turnstile = useTurnstile();

  onCloseRef.current = onClose;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (session) {
      onAuthenticated(session.account.email);
    }
  }, [onAuthenticated, session]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const email = customerAccountEmail.trim();
    if (!email) {
      return;
    }

    setAuthForm((current) => {
      if (current.email.trim()) {
        return current;
      }

      return { ...current, email };
    });
  }, [customerAccountEmail, open]);

  useEffect(() => {
    if (!open) {
      setRestoreStatus("idle");
      return;
    }

    if (!getCustomerAuthToken()) {
      setSession(null);
      setRestoreStatus("idle");
      return;
    }

    let cancelled = false;
    setRestoreStatus("restoring");

    void (async () => {
      try {
        const payload = await fetchCustomerMe();
        if (!cancelled) {
          setSession(payload);
          setRestoreStatus("idle");
        }
      } catch (error) {
        // Only a real 401 means the session is invalid — a network/API-down error should
        // leave the stored token alone so the drawer can recover once the API is back.
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setCustomerAuthToken(null);
        }
        if (!cancelled) {
          setSession(null);
          setRestoreStatus("failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const shell = drawer?.closest(".storefront-shell");
    const inertSiblings: HTMLElement[] = [];

    if (shell && drawer) {
      for (const child of Array.from(shell.children)) {
        if (
          child instanceof HTMLElement &&
          !child.contains(drawer) &&
          !child.hasAttribute("inert")
        ) {
          child.setAttribute("inert", "");
          inertSiblings.push(child);
        }
      }
    }

    if (drawer) {
      (getFocusableElements(drawer)[0] ?? drawer).focus();
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !drawer) {
        return;
      }

      const elements = getFocusableElements(drawer);
      if (elements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || active === drawer || !drawer.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const sibling of inertSiblings) {
        sibling.removeAttribute("inert");
      }
      const previousFocus = openerRef.current;
      openerRef.current = null;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open]);

  const isRestoringSession =
    open &&
    !session &&
    Boolean(getCustomerAuthToken()) &&
    restoreStatus !== "failed" &&
    authStatus === "idle";

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!open || !drawer || drawer.contains(document.activeElement)) {
      return;
    }

    (getFocusableElements(drawer)[0] ?? drawer).focus();
  }, [authView, isRestoringSession, open, portalTab, session]);

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    setMembershipStatus("loading");

    void (async () => {
      try {
        const payload = await fetchCustomerPortalMembership();
        if (!cancelled) {
          setMembership(payload);
          setMembershipStatus("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && !error.isNetworkError && error.status === 404) {
          setMembership(null);
          setMembershipStatus("not-found");
        } else {
          // Account data must fail closed; never substitute another customer's demo records.
          setMembership(null);
          setMembershipStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [membershipRetry, open, session]);

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    setBenefitsStatus("loading");

    void (async () => {
      try {
        const payload = await fetchCustomerPortalBenefits();
        if (!cancelled) {
          setBenefits(payload);
          setBenefitsStatus("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setBenefitsStatus("error");
        } else {
          setBenefits(null);
          setBenefitsStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [benefitsRetry, open, session]);

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    setTransactionsStatus("loading");

    void (async () => {
      try {
        const payload = await fetchCustomerPortalTransactions({
          limit: PORTAL_TRANSACTIONS_PAGE_SIZE,
          offset: transactionsOffset
        });
        if (!cancelled) {
          setTransactions(payload);
          setTransactionsStatus("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setTransactionsStatus("error");
        } else {
          setTransactions(null);
          setTransactionsStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, session, transactionsOffset, transactionsRetry]);

  useEffect(() => {
    if (!open || !session || portalTab !== "sessions") {
      return;
    }

    let cancelled = false;
    setCustomerSessionsStatus("loading");
    setCustomerSessionsError("");

    void (async () => {
      try {
        const payload = await fetchCustomerSessions();
        if (!cancelled) {
          setCustomerSessions(payload);
          setCustomerSessionsStatus("success");
        }
      } catch (error) {
        if (!cancelled) {
          setCustomerSessionsStatus("error");
          setCustomerSessionsError(
            normalizeError(error, { operation: "load signed-in devices", scope: "customer-auth" })
              .userMessage
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, portalTab, session, sessionsRetry]);

  const handleCopyVoucherCode = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Clipboard API may be unavailable in insecure contexts; still show copied confirmation.
    }
    setCopiedVoucherCode(code);
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedVoucherCode(null);
    }, 2000);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    try {
      const input: CustomerLoginInput = { email: authForm.email, password: authForm.password };
      await loginCustomer(input, turnstile.token);
      const payload = await fetchCustomerMe();
      setSession(payload);
      setRestoreStatus("idle");
      setAuthForm(emptyCustomerAuthForm);
      setShowPassword(false);
      setAuthStatus("idle");
    } catch (error) {
      turnstile.reset();
      setAuthStatus("error");
      setAuthError(
        normalizeError(error, { operation: "customer sign in", scope: "customer-auth" }).userMessage
      );
    }
  };

  const submitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    try {
      await registerCustomer(authForm, turnstile.token);
      const payload = await fetchCustomerMe();
      setSession(payload);
      setRestoreStatus("idle");
      setAuthForm(emptyCustomerAuthForm);
      setShowPassword(false);
      setAuthStatus("idle");
    } catch (error) {
      turnstile.reset();
      setAuthStatus("error");
      setAuthError(
        normalizeError(error, { operation: "customer registration", scope: "customer-auth" })
          .userMessage
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch {
      setCustomerAuthToken(null);
    } finally {
      setSession(null);
      setRestoreStatus("idle");
      setAuthView("login");
      setShowPassword(false);
      setPortalTab("transactions");
      setMembership(null);
      setMembershipStatus("idle");
      setBenefits(null);
      setBenefitsStatus("idle");
      setTransactions(null);
      setTransactionsStatus("idle");
      setTransactionsOffset(0);
      setCustomerSessions([]);
      setCustomerSessionsStatus("idle");
      setCustomerSessionsError("");
      setSessionActionId(null);
      setConfirmRevokeOthers(false);
      onLoggedOut?.();
    }
  };

  const revokeSession = async (sessionId: number) => {
    setSessionActionId(sessionId);
    setCustomerSessionsError("");

    try {
      await logoutCustomerSession(sessionId);
      setCustomerSessions((current) => current.filter((item) => item.id !== sessionId));
    } catch (error) {
      setCustomerSessionsError(
        normalizeError(error, { operation: "log out a device", scope: "customer-auth" }).userMessage
      );
    } finally {
      setSessionActionId(null);
    }
  };

  const revokeOtherSessions = async () => {
    setSessionActionId("others");
    setCustomerSessionsError("");

    try {
      await logoutCustomerOtherSessions();
      setCustomerSessions((current) => current.filter((item) => item.is_current));
      setConfirmRevokeOthers(false);
    } catch (error) {
      setCustomerSessionsError(
        normalizeError(error, { operation: "log out other devices", scope: "customer-auth" })
          .userMessage
      );
    } finally {
      setSessionActionId(null);
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % PORTAL_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + PORTAL_TABS.length) % PORTAL_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PORTAL_TABS.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = PORTAL_TABS[nextIndex];
    setConfirmRevokeOthers(false);
    setPortalTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  if (!open) {
    return null;
  }

  const close = () => {
    onClose();
  };

  const tabLabels: Record<AccountPortalTab, string> = {
    transactions: t("account.tab.transactions"),
    membership: t("account.tab.membership"),
    benefits: t("account.tab.benefits"),
    sessions: t("account.tab.sessions")
  };

  const renderAuthenticatedBody = () => {
    if (!session) {
      return null;
    }

    const sessionProfile = session.profile;
    const sessionOrders = [...session.orders].sort(
      (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at)
    );

    const membershipProfile = membership?.profile ?? null;
    const sessionLifetimeCents =
      membershipProfile?.lifetime_purchase_cents ??
      sessionProfile?.lifetime_purchase_cents ??
      sessionOrders.reduce((sum, order) => sum + order.subtotal_cents, 0);
    const sessionTotalOrders =
      membershipProfile?.total_orders ?? sessionProfile?.total_orders ?? sessionOrders.length;
    const sessionPointsBalance =
      membershipProfile?.points_balance ?? sessionProfile?.points_balance ?? 0;
    const sessionLastPurchaseAt =
      membershipProfile?.last_purchase_at ?? sessionProfile?.last_purchase_at ?? null;
    const membershipTierLabel =
      membershipProfile?.membership_tier ?? sessionProfile?.membership_tier ?? "Online Shopper";

    const tabId = (tab: AccountPortalTab) => `${baseId}-tab-${tab}`;
    const panelId = (tab: AccountPortalTab) => `${baseId}-panel-${tab}`;

    return (
      <div className="account-content">
        <section className="account-hero">
          <p className="eyebrow">{t("account.memberLabel", { tier: membershipTierLabel })}</p>
          <h3>
            {membershipProfile?.customer_name ??
              sessionProfile?.customer_name ??
              session.account.display_name}
          </h3>
          <p>{session.account.email}</p>
        </section>

        <section className="account-stat-grid" aria-label={t("account.title")}>
          <div>
            <span>{t("account.stat.points")}</span>
            <strong>{sessionPointsBalance.toLocaleString(locale)}</strong>
          </div>
          <div>
            <span>{t("account.stat.lifetime")}</span>
            <strong>{currencyFromCents(sessionLifetimeCents)}</strong>
          </div>
          <div>
            <span>{t("account.stat.orders")}</span>
            <strong>{sessionTotalOrders.toLocaleString(locale)}</strong>
          </div>
          <div>
            <span>{t("account.stat.lastOrder")}</span>
            <strong>
              {sessionLastPurchaseAt
                ? formatAccountDate(sessionLastPurchaseAt, locale)
                : sessionOrders[0]
                  ? formatAccountDate(sessionOrders[0].created_at, locale)
                  : "—"}
            </strong>
          </div>
        </section>

        <div className="account-portal-tabs" role="tablist" aria-label={t("account.dialogLabel")}>
          {PORTAL_TABS.map((tab, index) => {
            const isActive = portalTab === tab;
            return (
              <button
                aria-controls={panelId(tab)}
                aria-selected={isActive}
                className={`text-link${isActive ? " active" : ""}`}
                id={tabId(tab)}
                key={tab}
                onClick={() => {
                  setConfirmRevokeOthers(false);
                  setPortalTab(tab);
                }}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(element) => {
                  tabRefs.current[tab] = element;
                }}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                {tabLabels[tab]}
              </button>
            );
          })}
        </div>

        {portalTab === "transactions" ? (
          <section
            aria-labelledby={tabId("transactions")}
            className="account-section"
            id={panelId("transactions")}
            role="tabpanel"
            tabIndex={0}
          >
            <div className="account-section-head">
              <p className="eyebrow">{t("account.tab.transactions")}</p>
              <span className="status-pill">
                {(transactions ? transactions.total : sessionOrders.length).toLocaleString(locale)}
              </span>
            </div>

            {transactionsStatus === "loading" && !transactions ? (
              <p className="account-empty-note">{t("account.loadingTransactions")}</p>
            ) : transactionsStatus === "error" ? (
              <div className="account-retry-bar" role="alert">
                <p className="account-empty-note">{t("account.errorTransactions")}</p>
                <button
                  className="outline-button"
                  onClick={() => setTransactionsRetry((count) => count + 1)}
                  type="button"
                >
                  {t("account.retry")}
                </button>
              </div>
            ) : transactions && transactions.transactions.length > 0 ? (
              <>
                <div className="account-orders">
                  {transactions.transactions.map((transaction) => (
                    <article className="account-order" key={transaction.id}>
                      <div className="account-order-head">
                        <div>
                          <strong>{t("account.orderNumber", { id: transaction.id })}</strong>
                          <span>{formatAccountDate(transaction.created_at, locale)}</span>
                        </div>
                        <div className="account-order-total">
                          <strong>{currencyFromCents(transaction.total_cents)}</strong>
                          <span>{fulfillmentLabel(transaction.status)}</span>
                        </div>
                      </div>
                      <ul className="account-line-items">
                        {transaction.items.map((item, index) => (
                          <li key={`${transaction.id}-${index}-${item.product_name}`}>
                            <span>{item.product_name}</span>
                            <strong>
                              {item.quantity} &times; {currencyFromCents(item.unit_price_cents)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                      {transaction.fulfillment_history.length > 0 ? (
                        <div
                          className="account-fulfillment-timeline"
                          aria-label={`${t("account.orderNumber", { id: transaction.id })} ${t("account.deliveryProgress")}`}
                        >
                          <strong>{t("account.deliveryProgress")}</strong>
                          <ol>
                            {transaction.fulfillment_history.map((event) => (
                              <li key={event.id}>
                                <span>{fulfillmentLabel(event.to_status as FulfillmentStatus)}</span>
                                <small>
                                  {formatAccountDate(event.happened_at, locale)}
                                  {event.note ? ` — ${event.note}` : ""}
                                </small>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                      {transaction.applied_offers.length > 0 ? (
                        <ul className="account-payment-list" aria-label={t("account.offerLabel")}>
                          {transaction.applied_offers.map((offer, index) => (
                            <li key={`${transaction.id}-offer-${index}`}>
                              <span>
                                {offer.code ? (
                                  <>
                                    <span>{offer.label} </span>
                                    <button
                                      aria-label={`${t("account.copyCode")}: ${offer.code}`}
                                      className="status-pill"
                                      onClick={() => void handleCopyVoucherCode(offer.code!)}
                                      type="button"
                                    >
                                      {copiedVoucherCode === offer.code
                                        ? `${offer.code} · ${t("account.copiedCode")}`
                                        : offer.code}
                                    </button>
                                  </>
                                ) : (
                                  offer.label
                                )}
                              </span>
                              <strong>-{currencyFromCents(offer.discount_cents)}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {transaction.payments.length > 0 ? (
                        <ul className="account-payment-list" aria-label={t("account.paymentMethod")}>
                          {transaction.payments.map((payment, index) => (
                            <li key={`${transaction.id}-payment-${index}`}>
                              <span>
                                {payment.method} &middot; {payment.reference}
                              </span>
                              <strong>
                                {currencyFromCents(payment.amount_cents)} &middot; {payment.status}
                              </strong>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
                <div className="account-pagination">
                  <button
                    className="outline-button"
                    disabled={transactionsOffset === 0 || transactionsStatus === "loading"}
                    onClick={() =>
                      setTransactionsOffset((current) =>
                        Math.max(0, current - PORTAL_TRANSACTIONS_PAGE_SIZE)
                      )
                    }
                    type="button"
                  >
                    {t("account.prevPage")}
                  </button>
                  <span>
                    {transactions.total === 0
                      ? "0 / 0"
                      : `${transactionsOffset + 1}-${Math.min(
                          transactionsOffset + PORTAL_TRANSACTIONS_PAGE_SIZE,
                          transactions.total
                        )} / ${transactions.total}`}
                  </span>
                  <button
                    className="outline-button"
                    disabled={
                      transactionsStatus === "loading" ||
                      transactionsOffset + PORTAL_TRANSACTIONS_PAGE_SIZE >= transactions.total
                    }
                    onClick={() =>
                      setTransactionsOffset((current) => current + PORTAL_TRANSACTIONS_PAGE_SIZE)
                    }
                    type="button"
                  >
                    {t("account.nextPage")}
                  </button>
                </div>
              </>
            ) : (
              <p className="account-empty-note">{t("account.noTransactions")}</p>
            )}
          </section>
        ) : null}

        {portalTab === "membership" ? (
          <section
            aria-labelledby={tabId("membership")}
            className="account-section"
            id={panelId("membership")}
            role="tabpanel"
            tabIndex={0}
          >
            {membershipStatus === "loading" && !membership ? (
              <p className="account-empty-note">{t("account.loadingMembership")}</p>
            ) : membershipStatus === "error" ? (
              <div className="account-retry-bar" role="alert">
                <p className="account-empty-note">{t("account.errorMembership")}</p>
                <button
                  className="outline-button"
                  onClick={() => setMembershipRetry((count) => count + 1)}
                  type="button"
                >
                  {t("account.retry")}
                </button>
              </div>
            ) : membershipStatus === "not-found" || !membership ? (
              <div className="membership-panel">
                <div className="membership-current">
                  <p className="eyebrow">{t("account.membershipTier")}</p>
                  <h3>{membershipTierLabel}</h3>
                </div>
                <p className="account-empty-note">{t("account.noTransactions")}</p>
              </div>
            ) : (
              <div className="membership-panel">
                <div className="membership-current">
                  <p className="eyebrow">{t("account.membershipTier")}</p>
                  <h3>{membership.current_tier?.name ?? membership.profile.membership_tier}</h3>
                </div>

                {membership.next_tier ? (
                  <div className="membership-progress">
                    <div className="membership-progress-head">
                      <span>{t("account.tierProgress")}</span>
                      <span>
                        {t("account.nextTierLeft", {
                          amount: currencyFromCents(membership.next_tier.remaining_cents),
                          tier: membership.next_tier.name
                        })}
                      </span>
                    </div>
                    <div className="membership-progress-bar">
                      <div
                        className="membership-progress-fill"
                        style={{
                          width: `${
                            membership.next_tier.min_lifetime_purchase_cents > 0
                              ? Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    ((membership.next_tier.min_lifetime_purchase_cents -
                                      membership.next_tier.remaining_cents) /
                                      membership.next_tier.min_lifetime_purchase_cents) *
                                      100
                                  )
                                )
                              : 100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="membership-progress">
                    <span className="status-pill">{t("account.maxTierBadge")}</span>
                    <p className="account-empty-note">{t("account.topTierReached")}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : null}

        {portalTab === "benefits" ? (
          <section
            aria-labelledby={tabId("benefits")}
            className="account-section"
            id={panelId("benefits")}
            role="tabpanel"
            tabIndex={0}
          >
            <div className="account-section-head">
              <p className="eyebrow">{t("account.availableOffers")}</p>
            </div>

            {publicOffers &&
            (publicOffers.vouchers.length > 0 || publicOffers.promotions.length > 0) ? (
              <div className="account-offer-list">
                {publicOffers.vouchers.map((voucher) => (
                  <article className="account-offer-card" key={`voucher-${voucher.id}`}>
                    <div className="account-offer-card__meta">
                      <span className="account-offer-card__code">{voucher.code}</span>
                      <strong>{voucher.title}</strong>
                      {voucher.description ? <span>{voucher.description}</span> : null}
                      {voucher.minimum_subtotal_cents > 0 ? (
                        <span>
                          {t("account.minSpend", {
                            amount: currencyFromCents(voucher.minimum_subtotal_cents)
                          })}
                        </span>
                      ) : null}
                    </div>
                    <div className="account-offer-card__actions">
                      <button
                        className="outline-button"
                        onClick={() => void handleCopyVoucherCode(voucher.code)}
                        type="button"
                      >
                        {copiedVoucherCode === voucher.code
                          ? t("account.copiedCode")
                          : t("account.copyCode")}
                      </button>
                      {onApplyVoucher ? (
                        <button
                          className="solid-button"
                          onClick={() => onApplyVoucher(voucher.code)}
                          type="button"
                        >
                          {t("account.applyInCart")}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {publicOffers.promotions.map((promotion) => (
                  <article className="account-offer-card" key={`promo-${promotion.id}`}>
                    <div className="account-offer-card__meta">
                      <span className="account-offer-card__code">{promotion.label}</span>
                      <strong>{promotion.title}</strong>
                      {promotion.description ? <span>{promotion.description}</span> : null}
                      {promotion.minimum_subtotal_cents > 0 ? (
                        <span>
                          {t("account.minSpend", {
                            amount: currencyFromCents(promotion.minimum_subtotal_cents)
                          })}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="account-empty-note">{t("account.noActiveOffers")}</p>
            )}

            <div className="account-section-head">
              <p className="eyebrow">{t("account.tierLadder")}</p>
            </div>

            {benefitsStatus === "loading" && !benefits ? (
              <p className="account-empty-note">{t("account.loadingBenefits")}</p>
            ) : benefitsStatus === "error" ? (
              <div className="account-retry-bar" role="alert">
                <p className="account-empty-note">{t("account.errorBenefits")}</p>
                <button
                  className="outline-button"
                  onClick={() => setBenefitsRetry((count) => count + 1)}
                  type="button"
                >
                  {t("account.retry")}
                </button>
              </div>
            ) : benefits && benefits.tiers.length > 0 ? (
              <div className="benefit-tier-list">
                {benefits.tiers.map((tier) => {
                  const isCurrentTier =
                    benefits.current_tier?.toLowerCase() === tier.name.toLowerCase();
                  return (
                    <article
                      className={`benefit-tier${isCurrentTier ? " current" : ""}`}
                      key={tier.name}
                    >
                      <div className="benefit-tier-head">
                        <h4>{tier.name}</h4>
                        {isCurrentTier ? (
                          <span className="status-pill">{t("account.currentTierBadge")}</span>
                        ) : null}
                      </div>
                      {tier.min_lifetime_purchase_cents > 0 ? (
                        <span className="account-field-hint">
                          {t("account.minSpend", {
                            amount: currencyFromCents(tier.min_lifetime_purchase_cents)
                          })}
                        </span>
                      ) : null}
                      <ul className="benefit-list">
                        {tier.benefits.map((benefit) => (
                          <li key={`${tier.name}-${benefit.title}`}>
                            <strong>{benefit.title}</strong>
                            {benefit.description ? <span>{benefit.description}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="account-empty-note">{t("account.noActiveOffers")}</p>
            )}
          </section>
        ) : null}

        {portalTab === "sessions" ? (
          <section
            aria-labelledby={tabId("sessions")}
            className="account-section"
            id={panelId("sessions")}
            role="tabpanel"
            tabIndex={0}
          >
            <div className="account-section-head">
              <div>
                <p className="eyebrow">{t("account.tab.sessions")}</p>
                <p className="account-empty-note">{t("account.sessionsHint")}</p>
              </div>
              {customerSessions.some((item) => !item.is_current) ? (
                <button
                  className="text-link"
                  disabled={sessionActionId !== null || confirmRevokeOthers}
                  onClick={() => setConfirmRevokeOthers(true)}
                  type="button"
                >
                  {t("account.revokeOthers")}
                </button>
              ) : null}
            </div>

            {confirmRevokeOthers ? (
              <div
                aria-label={t("account.confirmRevokeTitle")}
                className="account-confirm-bar"
                role="alertdialog"
              >
                <span>{t("account.confirmRevokeTitle")}</span>
                <div className="account-confirm-bar__actions">
                  <button
                    className="outline-button"
                    disabled={sessionActionId !== null}
                    onClick={() => setConfirmRevokeOthers(false)}
                    type="button"
                  >
                    {t("account.cancel")}
                  </button>
                  <button
                    className="solid-button"
                    disabled={sessionActionId !== null}
                    onClick={() => void revokeOtherSessions()}
                    type="button"
                  >
                    {sessionActionId === "others"
                      ? t("account.revoking")
                      : t("account.confirmRevokeAction")}
                  </button>
                </div>
              </div>
            ) : null}

            {customerSessionsError && customerSessionsStatus !== "error" ? (
              <p className="cart-feedback" role="alert">
                {customerSessionsError}
              </p>
            ) : null}

            {customerSessionsStatus === "loading" ? (
              <p className="account-empty-note">{t("account.loadingSessions")}</p>
            ) : customerSessionsStatus === "error" ? (
              <div className="account-retry-bar" role="alert">
                <p className="account-empty-note">
                  {customerSessionsError || t("account.errorSessions")}
                </p>
                <button
                  className="outline-button"
                  onClick={() => setSessionsRetry((count) => count + 1)}
                  type="button"
                >
                  {t("account.retry")}
                </button>
              </div>
            ) : customerSessions.length === 0 ? (
              <p className="account-empty-note">{t("account.noSessions")}</p>
            ) : (
              <div className="customer-session-list">
                {customerSessions.map((item) => (
                  <article className="customer-session" key={item.id}>
                    <div>
                      <strong>
                        {customerSessionDeviceLabel(item.user_agent, t("account.unknownDevice"))}
                      </strong>
                      <span>
                        {item.is_current
                          ? t("account.currentDevice")
                          : t("account.lastSeen", {
                              time: formatRelativeTimeLocalized(item.last_seen_at, locale)
                            })}
                      </span>
                    </div>
                    {item.is_current ? (
                      <span className="status-pill">{t("account.currentDevice")}</span>
                    ) : (
                      <button
                        className="outline-button"
                        disabled={sessionActionId !== null}
                        onClick={() => void revokeSession(item.id)}
                        type="button"
                      >
                        {sessionActionId === item.id
                          ? t("account.revoking")
                          : t("account.revokeSession")}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <button className="outline-button" onClick={() => void handleLogout()} type="button">
          {t("account.signOut")}
        </button>
      </div>
    );
  };

  const registerPasswordHintId = `${baseId}-register-password-hint`;

  return (
    <div className="cart-overlay">
      <div className="cart-scrim" aria-hidden="true" onClick={close} />
      <aside
        aria-label={t("account.dialogLabel")}
        aria-modal="true"
        className="cart-drawer account-drawer"
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="cart-drawer-head">
          <h2>{t("account.title")}</h2>
          <button
            aria-label={t("account.close")}
            className="cart-close"
            onClick={close}
            type="button"
          >
            &times;
          </button>
        </header>

        <div className="cart-drawer-body">
          {isRestoringSession ? (
            <div className="account-restoring" role="status">
              {t("account.restoring")}
            </div>
          ) : session ? (
            renderAuthenticatedBody()
          ) : (
            <>
              <div className="account-auth-tabs" role="tablist" aria-label={t("account.dialogLabel")}>
                <button
                  aria-selected={authView === "login"}
                  className={`text-link${authView === "login" ? " active" : ""}`}
                  onClick={() => {
                    setAuthView("login");
                    setShowPassword(false);
                    setAuthError("");
                  }}
                  role="tab"
                  type="button"
                >
                  {t("account.signIn")}
                </button>
                <button
                  aria-selected={authView === "register"}
                  className={`text-link${authView === "register" ? " active" : ""}`}
                  onClick={() => {
                    setAuthView("register");
                    setShowPassword(false);
                    setAuthError("");
                  }}
                  role="tab"
                  type="button"
                >
                  {t("account.register")}
                </button>
              </div>

              {authView === "login" ? (
                <form className="account-lookup-form" onSubmit={(event) => void submitLogin(event)}>
                  <label>
                    <span>{t("account.email")}</span>
                    <input
                      autoComplete="email"
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={authForm.email}
                    />
                  </label>
                  <label>
                    <span>{t("account.password")}</span>
                    <div className="account-password-wrap">
                      <input
                        autoComplete="current-password"
                        onChange={(event) =>
                          setAuthForm((current) => ({ ...current, password: event.target.value }))
                        }
                        required
                        type={showPassword ? "text" : "password"}
                        value={authForm.password}
                      />
                      <button
                        aria-label={
                          showPassword ? t("account.hidePassword") : t("account.showPassword")
                        }
                        aria-pressed={showPassword}
                        className="account-password-toggle"
                        onClick={() => setShowPassword((current) => !current)}
                        type="button"
                      >
                        {showPassword ? t("account.hidePassword") : t("account.showPassword")}
                      </button>
                    </div>
                  </label>
                  <TurnstileSlot turnstile={turnstile} />
                  <button
                    className="solid-button"
                    disabled={
                      authStatus === "loading" || (turnstile.isConfigured && !turnstile.token)
                    }
                    type="submit"
                  >
                    {authStatus === "loading" ? t("account.signingIn") : t("account.signIn")}
                  </button>
                  {authStatus === "error" ? (
                    <p className="cart-feedback" role="alert">
                      {authError}
                    </p>
                  ) : null}
                </form>
              ) : (
                <form
                  className="account-lookup-form"
                  onSubmit={(event) => void submitRegister(event)}
                >
                  <label>
                    <span>{t("account.displayName")}</span>
                    <input
                      autoComplete="name"
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          display_name: event.target.value
                        }))
                      }
                      placeholder={t("account.displayNamePlaceholder")}
                      required
                      type="text"
                      value={authForm.display_name}
                    />
                  </label>
                  <label>
                    <span>{t("account.email")}</span>
                    <input
                      autoComplete="email"
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={authForm.email}
                    />
                  </label>
                  <label>
                    <span>{t("account.password")}</span>
                    <div className="account-password-wrap">
                      <input
                        aria-describedby={registerPasswordHintId}
                        autoComplete="new-password"
                        minLength={8}
                        onChange={(event) =>
                          setAuthForm((current) => ({ ...current, password: event.target.value }))
                        }
                        required
                        type={showPassword ? "text" : "password"}
                        value={authForm.password}
                      />
                      <button
                        aria-label={
                          showPassword ? t("account.hidePassword") : t("account.showPassword")
                        }
                        aria-pressed={showPassword}
                        className="account-password-toggle"
                        onClick={() => setShowPassword((current) => !current)}
                        type="button"
                      >
                        {showPassword ? t("account.hidePassword") : t("account.showPassword")}
                      </button>
                    </div>
                    <small className="account-field-hint" id={registerPasswordHintId}>
                      {t("account.passwordHint")}
                    </small>
                  </label>
                  <TurnstileSlot turnstile={turnstile} />
                  <button
                    className="solid-button"
                    disabled={
                      authStatus === "loading" || (turnstile.isConfigured && !turnstile.token)
                    }
                    type="submit"
                  >
                    {authStatus === "loading"
                      ? t("account.creatingAccount")
                      : t("account.createAccount")}
                  </button>
                  {authStatus === "error" ? (
                    <p className="cart-feedback" role="alert">
                      {authError}
                    </p>
                  ) : null}
                </form>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
