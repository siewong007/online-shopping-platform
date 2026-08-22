import { type FormEvent, useState } from "react";

import { normalizeError } from "../../../shared/notifications";
import type { AdminAuthPayload, AdminLoginInput, AdminLoginResponse } from "../types";

type AdminLoginScreenProps = {
  challengeToken: string | null;
  onBackToStore: () => void;
  onLogin: (input: AdminLoginInput) => Promise<AdminLoginResponse>;
  onVerify: (input: { code?: string; recovery_code?: string }) => Promise<AdminAuthPayload>;
};

export function AdminLoginScreen({
  challengeToken,
  onBackToStore,
  onLogin,
  onVerify
}: AdminLoginScreenProps) {
  const [form, setForm] = useState<AdminLoginInput>({ username: "", password: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      await onLogin({
        username: form.username.trim(),
        password: form.password
      });
    } catch (error) {
      setFeedback(normalizeError(error, { operation: "admin sign in", scope: "admin-auth" }).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Second sign-in step: the password was accepted; the authenticator code completes it.
  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challengeToken) return;
    const code = new FormData(event.currentTarget).get("code");
    const verification = typeof code === "string" ? code.trim() : "";
    if (!verification) return;

    setFeedback(null);
    setIsSubmitting(true);
    try {
      const input = useRecoveryCode
        ? { recovery_code: verification }
        : { code: verification };
      await onVerify(input);
    } catch (error) {
      setFeedback(
        normalizeError(error, { operation: "two-factor verification", scope: "admin-auth" }).userMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <div className="admin-brand">
          <div className="ekoway-mark compact" aria-hidden="true">
            <img src="/ekoway/ekoway-logo.jpeg" alt="" />
          </div>
          <div>
            <p className="eyebrow">Internal Retail Tools</p>
            <h1>OPT Console</h1>
          </div>
        </div>

        {challengeToken ? (
          <form className="admin-form" onSubmit={handleVerify}>
            <label className="admin-field">
              {useRecoveryCode ? "Recovery code" : "Authenticator code"}
              <input
                autoComplete="one-time-code"
                autoFocus
                inputMode={useRecoveryCode ? "text" : "numeric"}
                name="code"
                required
                spellCheck={false}
                type={useRecoveryCode ? "text" : "text"}
              />
            </label>

            <button className="text-link" onClick={() => setUseRecoveryCode((current) => !current)} type="button">
              {useRecoveryCode ? "Use an authenticator code instead" : "Use a recovery code instead"}
            </button>

            {feedback ? <p className="catalog-feedback error">{feedback}</p> : null}

            <div className="form-actions split-actions">
              <button className="solid-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Verifying..." : "Verify"}
              </button>
              <button className="outline-button" onClick={onBackToStore} type="button">
                Back to Storefront
              </button>
            </div>
          </form>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              Username
              <input
                autoComplete="username"
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                required
                value={form.username}
              />
            </label>

            <label className="admin-field">
              Password
              <input
                autoComplete="current-password"
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                required
                type="password"
                value={form.password}
              />
            </label>

            {feedback ? <p className="catalog-feedback error">{feedback}</p> : null}

            <div className="form-actions split-actions">
              <button className="solid-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
              <button className="outline-button" onClick={onBackToStore} type="button">
                Back to Storefront
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
