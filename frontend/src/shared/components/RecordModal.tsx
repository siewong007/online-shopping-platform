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

type RecordFormErrors<TValues extends object> = Partial<
  Record<keyof TValues & string, string | null | undefined>
>;

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
  const [errors, setErrors] = useState<RecordFormErrors<TValues>>({});

  const setFieldValue = (name: keyof TValues & string, value: string | boolean) => {
    onChange({ ...values, [name]: value } as TValues);
    setErrors((current) => ({ ...current, [name]: null }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fieldErrors = fields.reduce<RecordFormErrors<TValues>>((nextErrors, field) => {
      const message = validateField(field, values);
      return message ? { ...nextErrors, [field.name]: message } : nextErrors;
    }, {});
    const customErrors = validate?.(values) ?? {};
    const nextErrors = { ...fieldErrors, ...customErrors };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    void onSubmit(values);
  };

  const controlsDisabled = disabled || isSubmitting;

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      <div className="record-form-grid">
        {fields.map((field) => {
          const control = field.type ?? "text";
          const fieldDisabled = controlsDisabled || Boolean(field.disabled);
          const error = errors[field.name];
          const value = values[field.name];

          if (control === "checkbox") {
            return (
              <label className="record-checkbox-field" key={field.name}>
                <input
                  checked={Boolean(value)}
                  disabled={fieldDisabled}
                  onChange={(event) => setFieldValue(field.name, event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>{field.label}</strong>
                  {field.description ? <small>{field.description}</small> : null}
                  {error ? <small className="record-field-error">{error}</small> : null}
                </span>
              </label>
            );
          }

          if (control === "toggle") {
            return (
              <label className="record-toggle-field" key={field.name}>
                <input
                  checked={Boolean(value)}
                  disabled={fieldDisabled}
                  onChange={(event) => setFieldValue(field.name, event.target.checked)}
                  role="switch"
                  type="checkbox"
                />
                <span className="record-toggle-track" aria-hidden="true">
                  <span />
                </span>
                <span>
                  <strong>{field.label}</strong>
                  {field.description ? <small>{field.description}</small> : null}
                  {error ? <small className="record-field-error">{error}</small> : null}
                </span>
              </label>
            );
          }

          return (
            <label className="admin-field" key={field.name}>
              {field.label}
              {control === "select" ? (
                <select
                  disabled={fieldDisabled}
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
                  disabled={fieldDisabled}
                  maxLength={field.maxLength}
                  minLength={field.minLength}
                  onChange={(event) => setFieldValue(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={field.rows ?? 4}
                  value={typeof value === "string" ? value : ""}
                />
              ) : (
                <input
                  disabled={fieldDisabled}
                  max={field.max}
                  maxLength={field.maxLength}
                  min={field.min}
                  minLength={field.minLength}
                  onChange={(event) => setFieldValue(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  step={field.step}
                  type={control}
                  value={typeof value === "string" ? value : ""}
                />
              )}
              {field.helpText ? <small className="record-field-help">{field.helpText}</small> : null}
              {error ? <small className="record-field-error">{error}</small> : null}
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
