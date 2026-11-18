export type RecordFormControl =
  "checkbox" | "email" | "number" | "password" | "select" | "text" | "textarea" | "toggle";

export type RecordFormOption = {
  label: string;
  value: string;
};

export type RecordFormErrors<TValues extends object> = Partial<
  Record<keyof TValues & string, string | null | undefined>
> &
  Record<string, string | null | undefined>;

export type RecordFormField<TValues extends object> = {
  autoComplete?: string;
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

function isBlank(value: unknown): boolean {
  return typeof value === "string"
    ? value.trim().length === 0
    : value === null || value === undefined;
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

export function hasRecordFormErrors<TValues extends object>(
  errors: RecordFormErrors<TValues>
): boolean {
  return Object.values(errors).some(Boolean);
}
