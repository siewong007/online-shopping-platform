import { type FormEvent, type ReactNode, useEffect, useId, useState } from "react";

type RecordModalTone = "danger" | "live" | "warning";

type RecordModalProps = {
  children: ReactNode;
  eyebrow: string;
  isOpen: boolean;
  onClose: () => void;
  size?: "standard" | "wide";
  statusLabel?: string;
  statusTone?: RecordModalTone;
  title: string;
};

type RecordFormControl =
  | "checkbox"
  | "email"
  | "number"
  | "password"
  | "select"
  | "text"
  | "textarea"
  | "toggle";

type RecordFormOption = {
  label: string;
  value: string;
};

export type RecordFormErrors<TValues extends object> = Partial<
  Record<keyof TValues & string, string | null | undefined>
> & Record<string, string | null | undefined>;

export type RecordFormField<TValues extends object> = {
  description?: string;
  disabled?: boolean;
  helpText?: string;
  label: string;
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  name: keyof TValues & string;
  options?: RecordFormOption[];
  pattern?: RegExp;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  step?: number | string;
  type?: RecordFormControl;
  validate?: (value: TValues[keyof TValues], values: TValues) => string | null | undefined;
};

type RecordFormProps<TValues extends object> = {
  cancelLabel?: string;
  disabled?: boolean;
  feedback?: ReactNode;
  fields: RecordFormField<TValues>[];
  isSubmitting?: boolean;
  onCancel?: () => void;
  onChange: (values: TValues) => void;
  onSubmit: (values: TValues) => void | Promise<void>;
  submitLabel: string;
  validate?: (values: TValues) => RecordFormErrors<TValues> | null | undefined;
  values: TValues;
};

function isBlank(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length === 0 : value === null || value === undefined;
}

function validateField<TValues extends object>(
  field: RecordFormField<TValues>,
  values: TValues
): string | null {
  const value = values[field.name];
  const control = field.type ?? "text";
  const textValue = typeof value === "string" ? value : "";

  if (field.required) {
    if ((control === "checkbox" || control === "toggle") && value !== true) {
      return `${field.label} is required.`;
    }

    if (control !== "checkbox" && control !== "toggle" && isBlank(value)) {
      return `${field.label} is required.`;
    }
  }

  if (textValue.trim().length > 0) {
    if (field.minLength !== undefined && textValue.trim().length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters.`;
    }

    if (field.maxLength !== undefined && textValue.trim().length > field.maxLength) {
      return `${field.label} must be ${field.maxLength} characters or fewer.`;
    }

    if (control === "number" || field.min !== undefined || field.max !== undefined) {
      const numberValue = Number(textValue);

      if (!Number.isFinite(numberValue)) {
        return `${field.label} must be a number.`;
      }

      if (field.min !== undefined && numberValue < field.min) {
        return `${field.label} must be at least ${field.min}.`;
      }

      if (field.max !== undefined && numberValue > field.max) {
        return `${field.label} must be ${field.max} or less.`;
      }
    }

    if (field.pattern) {
      field.pattern.lastIndex = 0;

      if (!field.pattern.test(textValue)) {
        return `${field.label} is not in the expected format.`;
      }
    }
  }

  return field.validate?.(value, values) ?? null;
}

export function validateRecordFields<TValues extends object>(
  fields: RecordFormField<TValues>[],
  values: TValues,
  validate?: (values: TValues) => RecordFormErrors<TValues> | null | undefined
): RecordFormErrors<TValues> {
  const errors: RecordFormErrors<TValues> = {};

  for (const field of fields) {
    const message = validateField(field, values);
    if (message) errors[field.name] = message;
  }

  for (const [name, message] of Object.entries(validate?.(values) ?? {})) {
    if (message) errors[name as keyof TValues & string] = message as string;
  }

  return errors;
}

export function hasRecordFormErrors<TValues extends object>(errors: RecordFormErrors<TValues>): boolean {
  return Object.values(errors).some(Boolean);
}

function idSafeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function RecordModal({
  children,
  eyebrow,
  isOpen,
  onClose,
  size = "standard",
  statusLabel,
  statusTone,
  title
}: RecordModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="record-modal-overlay">
      <button className="record-modal-scrim" aria-label="Close record window" onClick={onClose} />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`record-modal-dialog record-modal-${size}`}
        role="dialog"
      >
        <header className="record-modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3 id={titleId}>{title}</h3>
          </div>
          <div className="record-modal-head-actions">
            {statusLabel ? (
              <span className={`status-pill ${statusTone ?? ""}`}>{statusLabel}</span>
            ) : null}
            <button className="record-modal-close" aria-label="Close record window" onClick={onClose}>
              &times;
            </button>
          </div>
        </header>
        <div className="record-modal-body">{children}</div>
      </section>
    </div>
  );
}

export function RecordForm<TValues extends object>({
  cancelLabel = "Cancel",
  disabled = false,
  feedback,
  fields,
  isSubmitting = false,
  onCancel,
  onChange,
  onSubmit,
  submitLabel,
  validate,
  values
}: RecordFormProps<TValues>) {
  const formId = useId().replace(/:/g, "");
  const [errors, setErrors] = useState<RecordFormErrors<TValues>>({});

  const fieldId = (name: keyof TValues & string) => `${formId}-${idSafeName(name)}`;

  const setFieldValue = (name: keyof TValues & string, value: string | boolean) => {
    onChange({ ...values, [name]: value } as TValues);
    setErrors((current) => ({ ...current, [name]: null }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateRecordFields(fields, values, validate);

    setErrors(nextErrors);

    const hasErrors = hasRecordFormErrors(nextErrors);
    const firstInvalidField = fields.find((field) => Boolean(nextErrors[field.name]));
    if (firstInvalidField) {
      const control = document.getElementById(fieldId(firstInvalidField.name));
      control?.focus();
      control?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (hasErrors) return;

    void onSubmit(values);
  };

  const controlsDisabled = disabled || isSubmitting;
  const fieldErrorEntries = fields.flatMap((field) => {
    const message = errors[field.name];
    return message ? [{ field, message }] : [];
  });
  const fieldNames = new Set<string>(fields.map((field) => field.name));
  const unmatchedErrorEntries = Object.entries(errors).flatMap(([name, message]) =>
    message && !fieldNames.has(name) ? [{ name, message }] : []
  );
  const showErrorSummary = fieldErrorEntries.length > 1 || unmatchedErrorEntries.length > 0;
  const summaryTitleId = `${formId}-error-summary-title`;

  return (
    <form className="record-form" noValidate onSubmit={handleSubmit}>
      {showErrorSummary ? (
        <section aria-labelledby={summaryTitleId} className="record-form-error-summary" role="alert">
          <h4 id={summaryTitleId}>Review the highlighted fields</h4>
          <p>Correct these items before submitting:</p>
          <ul>
            {fieldErrorEntries.map(({ field, message }) => (
              <li key={field.name}>
                <a href={`#${fieldId(field.name)}`}>{field.label}: {message}</a>
              </li>
            ))}
            {unmatchedErrorEntries.map(({ name, message }) => (
              <li key={name}>Form: {message}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="record-form-grid">
        {fields.map((field) => {
          const control = field.type ?? "text";
          const fieldDisabled = controlsDisabled || Boolean(field.disabled);
          const error = errors[field.name];
          const value = values[field.name];
          const controlId = fieldId(field.name);
          const helpId = `${controlId}-help`;
          const errorId = `${controlId}-error`;
          const describedBy = [field.helpText || field.description ? helpId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined;

          if (control === "checkbox") {
            return (
              <label className="record-checkbox-field" htmlFor={controlId} key={field.name}>
                <input
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  checked={Boolean(value)}
                  disabled={fieldDisabled}
                  id={controlId}
                  name={field.name}
                  onChange={(event) => setFieldValue(field.name, event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>{field.label}</strong>
                  {field.description ? <small id={helpId}>{field.description}</small> : null}
                  {error ? <small className="record-field-error" id={errorId}>{error}</small> : null}
                </span>
              </label>
            );
          }

          if (control === "toggle") {
            return (
              <label className="record-toggle-field" htmlFor={controlId} key={field.name}>
                <input
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  checked={Boolean(value)}
                  disabled={fieldDisabled}
                  id={controlId}
                  name={field.name}
                  onChange={(event) => setFieldValue(field.name, event.target.checked)}
                  role="switch"
                  type="checkbox"
                />
                <span className="record-toggle-track" aria-hidden="true">
                  <span />
                </span>
                <span>
                  <strong>{field.label}</strong>
                  {field.description ? <small id={helpId}>{field.description}</small> : null}
                  {error ? <small className="record-field-error" id={errorId}>{error}</small> : null}
                </span>
              </label>
            );
          }

          return (
            <label className="admin-field" htmlFor={controlId} key={field.name}>
              {field.label}
              {control === "select" ? (
                <select
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  disabled={fieldDisabled}
                  id={controlId}
                  name={field.name}
                  onChange={(event) => setFieldValue(field.name, event.target.value)}
                  required={field.required}
                  value={typeof value === "string" ? value : ""}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : control === "textarea" ? (
                <textarea
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  disabled={fieldDisabled}
                  id={controlId}
                  maxLength={field.maxLength}
                  minLength={field.minLength}
                  name={field.name}
                  onChange={(event) => setFieldValue(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={field.rows ?? 4}
                  value={typeof value === "string" ? value : ""}
                />
              ) : (
                <input
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  disabled={fieldDisabled}
                  id={controlId}
                  max={field.max}
                  maxLength={field.maxLength}
                  min={field.min}
                  minLength={field.minLength}
                  name={field.name}
                  onChange={(event) => setFieldValue(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  step={field.step}
                  type={control}
                  value={typeof value === "string" ? value : ""}
                />
              )}
              {field.helpText ? <small className="record-field-help" id={helpId}>{field.helpText}</small> : null}
              {error ? <small className="record-field-error" id={errorId}>{error}</small> : null}
            </label>
          );
        })}
      </div>

      {feedback}

      <div className="form-actions split-actions">
        <button className="solid-button" disabled={controlsDisabled} type="submit">
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button className="outline-button" disabled={isSubmitting} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
