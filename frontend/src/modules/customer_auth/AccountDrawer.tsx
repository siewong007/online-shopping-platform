import { type FormEvent, useEffect, useState } from "react";

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
import { currencyFromCents, formatOrderDate, formatRelativeTime } from "../../shared/formatters";
import { normalizeError } from "../../shared/notifications";
import type {
  CustomerLoginInput,
  CustomerMePayload,
  CustomerRegisterInput,
  CustomerSession,
  CustomerTransactionsPayload,
  FulfillmentStatus,
  MembershipBenefitsPayload,
  MembershipPayload,
  Order
} from "../../types";
import type { Voucher } from "../offers/types";
import { fulfillmentLabel } from "../../app/utils";

type AccountDrawerProps = {
  open: boolean;
  customerAccountEmail: string;
  onAuthenticated: (email: string) => void;
  onClose: () => void;
};

type AccountAuthView = "login" | "register";
type AccountPortalTab = "transactions" | "membership" | "benefits" | "sessions";
type PortalLoadStatus = "idle" | "loading" | "success" | "not-found" | "error";

const PORTAL_TRANSACTIONS_PAGE_SIZE = 20;

function customerSessionDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const platform = userAgent.includes("iPhone") || userAgent.includes("iPad")
    ? "iOS"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("Mac OS")
        ? "macOS"
        : userAgent.includes("Windows")
          ? "Windows"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown platform";

  return `${browser} on ${platform}`;
}

const emptyCustomerAuthForm: CustomerRegisterInput = {
  email: "",
  password: "",
  display_name: ""
};

export function AccountDrawer({
  open,
  customerAccountEmail,
  onAuthenticated,
  onClose
}: AccountDrawerProps) {
  const [session, setSession] = useState<CustomerMePayload | null>(null);
  const [authView, setAuthView] = useState<AccountAuthView>("login");
  const [authForm, setAuthForm] = useState<CustomerRegisterInput>(emptyCustomerAuthForm);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "error">("idle");
  const [authError, setAuthError] = useState("");

  const [portalTab, setPortalTab] = useState<AccountPortalTab>("transactions");

  const [membership, setMembership] = useState<MembershipPayload | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<PortalLoadStatus>("idle");

  const [benefits, setBenefits] = useState<MembershipBenefitsPayload | null>(null);
  const [benefitsStatus, setBenefitsStatus] = useState<PortalLoadStatus>("idle");

  const [transactions, setTransactions] = useState<CustomerTransactionsPayload | null>(null);
  const [transactionsStatus, setTransactionsStatus] = useState<PortalLoadStatus>("idle");
  const [transactionsOffset, setTransactionsOffset] = useState(0);
  const [customerSessions, setCustomerSessions] = useState<CustomerSession[]>([]);
  const [customerSessionsStatus, setCustomerSessionsStatus] = useState<PortalLoadStatus>("idle");
  const [customerSessionsError, setCustomerSessionsError] = useState("");
  const [sessionActionId, setSessionActionId] = useState<number | "others" | null>(null);
  const turnstile = useTurnstile();

  useEffect(() => {
    if (session) {
      onAuthenticated(session.account.email);
    }
  }, [onAuthenticated, session]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!getCustomerAuthToken()) {
      setSession(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchCustomerMe();
        if (!cancelled) {
          setSession(payload);
        }
      } catch (error) {
        // Only a real 401 means the session is invalid — a network/API-down error should
        // leave the stored token alone so the drawer can recover once the API is back.
        if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setCustomerAuthToken(null);
        }
        if (!cancelled) {
          setSession(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

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
        } else if (error instanceof ApiError && !error.isNetworkError && error.status === 401) {
          setMembershipStatus("error");
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
  }, [open, session]);

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
  }, [open, session]);

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
  }, [open, session, transactionsOffset]);

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
            normalizeError(error, { operation: "load signed-in devices", scope: "customer-auth" }).userMessage
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, portalTab, session]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    try {
      const input: CustomerLoginInput = { email: authForm.email, password: authForm.password };
      await loginCustomer(input, turnstile.token);
      const payload = await fetchCustomerMe();
      setSession(payload);
      setAuthForm(emptyCustomerAuthForm);
      setAuthStatus("idle");
    } catch (error) {
      turnstile.reset();
      setAuthStatus("error");
      setAuthError(normalizeError(error, { operation: "customer sign in", scope: "customer-auth" }).userMessage);
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
      setAuthForm(emptyCustomerAuthForm);
      setAuthStatus("idle");
    } catch (error) {
      turnstile.reset();
      setAuthStatus("error");
      setAuthError(normalizeError(error, { operation: "customer registration", scope: "customer-auth" }).userMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch {
      setCustomerAuthToken(null);
    } finally {
      setSession(null);
      setAuthView("login");
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
    if (!window.confirm("Log out all other devices? This device will stay signed in.")) {
      return;
    }

    setSessionActionId("others");
    setCustomerSessionsError("");

    try {
      await logoutCustomerOtherSessions();
      setCustomerSessions((current) => current.filter((item) => item.is_current));
    } catch (error) {
      setCustomerSessionsError(
        normalizeError(error, { operation: "log out other devices", scope: "customer-auth" }).userMessage
      );
    } finally {
      setSessionActionId(null);
    }
  };

  if (!open) {
    return null;
  }

  const close = () => {
    onClose();
  };

  if (session) {
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
    const sessionPointsBalance = membershipProfile?.points_balance ?? sessionProfile?.points_balance ?? 0;
    const sessionLastPurchaseAt = membershipProfile?.last_purchase_at ?? sessionProfile?.last_purchase_at ?? null;
    const membershipTierLabel =
      membershipProfile?.membership_tier ?? sessionProfile?.membership_tier ?? "Online Shopper";

    return (
      <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="My account">
        <button className="cart-scrim" aria-label="Close account" onClick={close} />
        <aside className="cart-drawer account-drawer">
          <header className="cart-drawer-head">
            <h2>My Account</h2>
            <button className="cart-close" onClick={close} aria-label="Close account">
              &times;
            </button>
          </header>

          <div className="account-content">
            <section className="account-hero">
              <p className="eyebrow">{membershipTierLabel}</p>
              <h3>{membershipProfile?.customer_name ?? sessionProfile?.customer_name ?? session.account.display_name}</h3>
              <p>{session.account.email}</p>
            </section>

            <section className="account-stat-grid" aria-label="Account summary">
              <div>
                <span>Points</span>
                <strong>{sessionPointsBalance.toLocaleString()}</strong>
              </div>
              <div>
                <span>Lifetime Spend</span>
                <strong>{currencyFromCents(sessionLifetimeCents)}</strong>
              </div>
              <div>
                <span>Orders</span>
                <strong>{sessionTotalOrders.toLocaleString()}</strong>
              </div>
              <div>
                <span>Last Purchase</span>
                <strong>
                  {sessionLastPurchaseAt
                    ? formatOrderDate(sessionLastPurchaseAt)
                    : sessionOrders[0]
                      ? formatOrderDate(sessionOrders[0].created_at)
                      : "None yet"}
                </strong>
              </div>
            </section>

            <div className="account-portal-tabs" role="tablist" aria-label="Account portal">
              <button
                role="tab"
                aria-selected={portalTab === "transactions"}
                className={`text-link${portalTab === "transactions" ? " active" : ""}`}
                onClick={() => setPortalTab("transactions")}
              >
                Orders & cart history
              </button>
              <button
                role="tab"
                aria-selected={portalTab === "membership"}
                className={`text-link${portalTab === "membership" ? " active" : ""}`}
                onClick={() => setPortalTab("membership")}
              >
                Membership
              </button>
              <button
                role="tab"
                aria-selected={portalTab === "benefits"}
                className={`text-link${portalTab === "benefits" ? " active" : ""}`}
                onClick={() => setPortalTab("benefits")}
              >
                Benefits
              </button>
              <button
                role="tab"
                aria-selected={portalTab === "sessions"}
                className={`text-link${portalTab === "sessions" ? " active" : ""}`}
                onClick={() => setPortalTab("sessions")}
              >
                Sessions
              </button>
            </div>

            {portalTab === "transactions" ? (
              <section className="account-section" aria-label="Transactions">
                <div className="account-section-head">
                  <p className="eyebrow">Orders & cart history</p>
                  <span className="status-pill">
                    {transactions ? `${transactions.total} found` : `${sessionOrders.length} found`}
                  </span>
                </div>

                {transactionsStatus === "loading" && !transactions ? (
                  <p className="account-empty-note">Loading transactions...</p>
                ) : transactionsStatus === "error" ? (
                  <p className="account-empty-note">Unable to load transactions right now.</p>
                ) : transactions && transactions.transactions.length > 0 ? (
                  <>
                    <div className="account-orders">
                      {transactions.transactions.map((transaction) => (
                        <article className="account-order" key={transaction.id}>
                          <div className="account-order-head">
                            <div>
                              <strong>Order #{transaction.id}</strong>
                              <span>{formatOrderDate(transaction.created_at)}</span>
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
                                  {item.quantity} x {currencyFromCents(item.unit_price_cents)}
                                </strong>
                              </li>
                            ))}
                          </ul>
                          {transaction.fulfillment_history.length > 0 ? (
                            <div className="account-fulfillment-timeline" aria-label={`Order ${transaction.id} delivery progress`}>
                              <strong>Delivery progress</strong>
                              <ol>
                                {transaction.fulfillment_history.map((event) => (
                                  <li key={event.id}>
                                    <span>{fulfillmentLabel(event.to_status as FulfillmentStatus)}</span>
                                    <small>{formatOrderDate(event.happened_at)}{event.note ? ` — ${event.note}` : ""}</small>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : null}
                          {transaction.applied_offers.length > 0 ? (
                            <ul className="account-payment-list" aria-label="Redeemed offers">
                              {transaction.applied_offers.map((offer, index) => (
                                <li key={`${transaction.id}-offer-${index}`}>
                                  <span>{offer.code ? `Voucher ${offer.code}` : offer.label}</span>
                                  <strong>-{currencyFromCents(offer.discount_cents)}</strong>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {transaction.payments.length > 0 ? (
                            <ul className="account-payment-list">
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
                      >
                        Previous
                      </button>
                      <span>
                        {transactions.total === 0
                          ? "0 of 0"
                          : `${transactionsOffset + 1}-${Math.min(
                              transactionsOffset + PORTAL_TRANSACTIONS_PAGE_SIZE,
                              transactions.total
                            )} of ${transactions.total}`}
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
                      >
                        Load more
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="account-empty-note">No transactions are attached to this account yet.</p>
                )}
              </section>
            ) : null}

            {portalTab === "membership" ? (
              <section className="account-section" aria-label="Membership">
                {membershipStatus === "loading" && !membership ? (
                  <p className="account-empty-note">Loading membership details...</p>
                ) : membershipStatus === "not-found" ? (
                  <p className="account-empty-note">No membership profile is linked to this account yet.</p>
                ) : membershipStatus === "error" ? (
                  <p className="account-empty-note">Unable to load membership details right now.</p>
                ) : membership ? (
                  <div className="membership-panel">
                    <div className="membership-current">
                      <p className="eyebrow">Current tier</p>
                      <h3>{membership.current_tier?.name ?? membership.profile.membership_tier}</h3>
                    </div>
                    <dl className="membership-stats">
                      <div>
                        <dt>Points balance</dt>
                        <dd>{membership.profile.points_balance.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Lifetime spend</dt>
                        <dd>{currencyFromCents(membership.profile.lifetime_purchase_cents)}</dd>
                      </div>
                      <div>
                        <dt>Total orders</dt>
                        <dd>{membership.profile.total_orders.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Last purchase</dt>
                        <dd>
                          {membership.profile.last_purchase_at
                            ? formatOrderDate(membership.profile.last_purchase_at)
                            : "None yet"}
                        </dd>
                      </div>
                    </dl>

                    {membership.next_tier ? (
                      <div className="membership-progress">
                        <div className="membership-progress-head">
                          <span>Progress to {membership.next_tier.name}</span>
                          <span>{currencyFromCents(membership.next_tier.remaining_cents)} to go</span>
                        </div>
                        <div className="membership-progress-bar">
                          <div
                            className="membership-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((membership.next_tier.min_lifetime_purchase_cents -
                                    membership.next_tier.remaining_cents) /
                                    membership.next_tier.min_lifetime_purchase_cents) *
                                    100
                                )
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="account-empty-note">You have reached the top membership tier.</p>
                    )}
                  </div>
                ) : (
                  <p className="account-empty-note">No membership profile is linked to this account yet.</p>
                )}
              </section>
            ) : null}

            {portalTab === "benefits" ? (
              <section className="account-section" aria-label="Benefits">
                {benefitsStatus === "loading" && !benefits ? (
                  <p className="account-empty-note">Loading benefits...</p>
                ) : benefitsStatus === "error" ? (
                  <p className="account-empty-note">Unable to load benefits right now.</p>
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
                            {isCurrentTier ? <span className="status-pill">Your tier</span> : null}
                          </div>
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
                  <p className="account-empty-note">No benefit tiers are available right now.</p>
                )}
              </section>
            ) : null}

            {portalTab === "sessions" ? (
              <section className="account-section" aria-label="Signed-in devices">
                <div className="account-section-head">
                  <div>
                    <p className="eyebrow">Account security</p>
                    <h3>Signed-in devices</h3>
                  </div>
                  {customerSessions.some((item) => !item.is_current) ? (
                    <button
                      className="text-link"
                      disabled={sessionActionId !== null}
                      onClick={() => void revokeOtherSessions()}
                    >
                      Log out others
                    </button>
                  ) : null}
                </div>

                {customerSessionsStatus === "loading" ? (
                  <p className="account-empty-note">Loading signed-in devices...</p>
                ) : customerSessionsStatus === "error" ? (
                  <p className="account-empty-note">{customerSessionsError || "Unable to load signed-in devices."}</p>
                ) : customerSessions.length === 0 ? (
                  <p className="account-empty-note">No active sessions were found.</p>
                ) : (
                  <div className="customer-session-list">
                    {customerSessions.map((item) => (
                      <article className="customer-session" key={item.id}>
                        <div>
                          <strong>{customerSessionDeviceLabel(item.user_agent)}</strong>
                          <span>
                            {item.is_current
                              ? "This device"
                              : `Last active ${formatRelativeTime(item.last_seen_at)}`}
                          </span>
                        </div>
                        {item.is_current ? (
                          <span className="status-pill">Current</span>
                        ) : (
                          <button
                            className="outline-button"
                            disabled={sessionActionId !== null}
                            onClick={() => void revokeSession(item.id)}
                          >
                            {sessionActionId === item.id ? "Logging out..." : "Log out"}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <button className="outline-button" onClick={() => void handleLogout()}>
              Log out
            </button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="cart-overlay" role="dialog" aria-modal="true" aria-label="My account">
      <button className="cart-scrim" aria-label="Close account" onClick={close} />
      <aside className="cart-drawer account-drawer">
        <header className="cart-drawer-head">
          <h2>My Account</h2>
          <button className="cart-close" onClick={close} aria-label="Close account">
            &times;
          </button>
        </header>

        <div className="account-auth-tabs">
          <button
            className={`text-link${authView === "login" ? " active" : ""}`}
            onClick={() => {
              setAuthView("login");
              setAuthError("");
            }}
          >
            Sign in
          </button>
          <button
            className={`text-link${authView === "register" ? " active" : ""}`}
            onClick={() => {
              setAuthView("register");
              setAuthError("");
            }}
          >
            Create account
          </button>
        </div>

        <TurnstileSlot turnstile={turnstile} />

        {authView === "login" ? (
          <form className="account-lookup-form" onSubmit={(event) => void submitLogin(event)}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </label>
            <button
              className="solid-button"
              disabled={authStatus === "loading" || (turnstile.isConfigured && !turnstile.token)}
            >
              {authStatus === "loading" ? "Signing in..." : "Sign in"}
            </button>
            {authStatus === "error" ? <p className="cart-feedback">{authError}</p> : null}
          </form>
        ) : authView === "register" ? (
          <form className="account-lookup-form" onSubmit={(event) => void submitRegister(event)}>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={authForm.display_name}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, display_name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                minLength={8}
                required
              />
            </label>
            <button
              className="solid-button"
              disabled={authStatus === "loading" || (turnstile.isConfigured && !turnstile.token)}
            >
              {authStatus === "loading" ? "Creating account..." : "Create account"}
            </button>
            {authStatus === "error" ? <p className="cart-feedback">{authError}</p> : null}
          </form>
        ) : null}
      </aside>
    </div>
  );
}
