import { type FormEvent, useState } from "react";

import { TurnstileSlot, useTurnstile } from "../../../shared/components/TurnstileSlot";
import { normalizeError } from "../../../shared/notifications";
import type { AdminAuthPayload, AdminLoginInput, AdminLoginResponse } from "../types";

type AdminLoginScreenProps = {
  challengeToken: string | null;
  onBackToStore: () => void;
  onCancelChallenge?: () => void;
  onLogin: (input: AdminLoginInput, turnstileToken: string | null) => Promise<AdminLoginResponse>;
  onVerify: (input: { code?: string; recovery_code?: string }) => Promise<AdminAuthPayload>;
};

export function AdminLoginScreen({
  challengeToken,
  onBackToStore,
  onCancelChallenge,
  onLogin,
  onVerify
}: AdminLoginScreenProps) {
  const [form, setForm] = useState<AdminLoginInput>({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const turnstile = useTurnstile();

  const [prevChallengeToken, setPrevChallengeToken] = useState(challengeToken);
  if (prevChallengeToken !== challengeToken) {
    setPrevChallengeToken(challengeToken);
    setCodeInput("");
    setUseRecoveryCode(false);
    setFeedback(null);
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      await onLogin(
        {
          username: form.username.trim(),
          password: form.password
        },
        turnstile.token
      );
    } catch (error) {
      turnstile.reset();
      setFeedback(
        normalizeError(error, { operation: "admin sign in", scope: "admin-auth" }).userMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Second sign-in step: the password was accepted; the authenticator code completes it.
  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challengeToken) return;
    const verification = codeInput.trim();
    if (!verification) return;

    setFeedback(null);
    setIsSubmitting(true);
    try {
      const input = useRecoveryCode ? { recovery_code: verification } : { code: verification };
      await onVerify(input);
    } catch (error) {
      setFeedback(
        normalizeError(error, { operation: "two-factor verification", scope: "admin-auth" })
          .userMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRecoveryCode = () => {
    setUseRecoveryCode((current) => !current);
    setCodeInput("");
    setFeedback(null);
  };

  const handleSwitchAccount = () => {
    setCodeInput("");
    setUseRecoveryCode(false);
    setFeedback(null);
    onCancelChallenge?.();
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
            <div className="admin-mfa-header">
              <span className="status-pill admin-mfa-badge">
                Step 2 of 2 · Two-Factor Verification
              </span>
              <p className="admin-mfa-helper">
                {useRecoveryCode
                  ? "Enter one of your saved single-use recovery codes to complete sign-in."
                  : "Enter the 6-digit verification code from your authenticator app."}
              </p>
            </div>

            <label className="admin-field">
              {useRecoveryCode ? "Recovery code" : "Authenticator code"}
              <input
                autoComplete="one-time-code"
                autoFocus
                className="admin-mfa-input"
                inputMode={useRecoveryCode ? "text" : "numeric"}
                maxLength={useRecoveryCode ? 32 : 8}
                name="code"
                onChange={(event) => setCodeInput(event.target.value)}
                placeholder={useRecoveryCode ? "XXXX-XXXX" : "000000"}
                required
                spellCheck={false}
                type="text"
                value={codeInput}
              />
            </label>

            <button className="text-link" onClick={handleToggleRecoveryCode} type="button">
              {useRecoveryCode
                ? "Use an authenticator code instead"
                : "Use a recovery code instead"}
            </button>

            {feedback ? (
              <p className="catalog-feedback error" role="alert">
                {feedback}
              </p>
            ) : null}

            <div className="admin-login-actions">
              <button
                className="solid-button admin-login-submit"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Verifying..." : "Verify"}
              </button>
              <button
                className="text-link admin-login-switch"
                onClick={handleSwitchAccount}
                type="button"
              >
                Sign in with a different account
              </button>
              <button className="text-link admin-login-back" onClick={onBackToStore} type="button">
                ← Back to Storefront
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
              <div className="admin-password-wrap">
                <input
                  autoComplete="current-password"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="admin-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <TurnstileSlot turnstile={turnstile} />

            {feedback ? (
              <p className="catalog-feedback error" role="alert">
                {feedback}
              </p>
            ) : null}

            <div className="admin-login-actions">
              <button
                className="solid-button admin-login-submit"
                disabled={isSubmitting || (turnstile.isConfigured && !turnstile.token)}
                type="submit"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
              <button className="text-link admin-login-back" onClick={onBackToStore} type="button">
                ← Back to Storefront
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
