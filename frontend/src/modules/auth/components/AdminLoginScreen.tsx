import { type FormEvent, useState } from "react";

import type { AdminAuthPayload, AdminLoginInput } from "../types";

type AdminLoginScreenProps = {
  onBackToStore: () => void;
  onLogin: (input: AdminLoginInput) => Promise<AdminAuthPayload>;
};

export function AdminLoginScreen({ onBackToStore, onLogin }: AdminLoginScreenProps) {
  const [form, setForm] = useState<AdminLoginInput>({ username: "", password: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setFeedback(error instanceof Error ? error.message : "Unable to sign in.");
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
            <h1>Ops Console</h1>
          </div>
        </div>

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
      </section>
    </main>
  );
}
