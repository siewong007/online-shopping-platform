import { describe, expect, test } from "bun:test";

import {
  hasRecordFormErrors,
  type RecordFormField,
  validateRecordFields
} from "../../src/shared/components/RecordModal";

type Values = {
  active: boolean;
  email: string;
  name: string;
  quantity: string;
};

const fields: RecordFormField<Values>[] = [
  { label: "Name", name: "name", required: true },
  { label: "Email", name: "email", pattern: /^[^@]+@[^@]+$/ },
  { label: "Quantity", name: "quantity", min: 2, type: "number" },
  { label: "Active", name: "active", required: true, type: "toggle" }
];

describe("record form validation", () => {
  test("maps multiple field failures for the accessible summary", () => {
    const values: Values = { active: false, email: "invalid", name: " ", quantity: "1" };

    expect(validateRecordFields(fields, values)).toEqual({
      name: "Name is required.",
      email: "Email is not in the expected format.",
      quantity: "Quantity must be at least 2.",
      active: "Active is required."
    });
    expect(values).toEqual({ active: false, email: "invalid", name: " ", quantity: "1" });
  });

  test("merges form-level validation into its matching field", () => {
    const values: Values = { active: true, email: "taken@example.com", name: "Amina", quantity: "2" };
    const result = validateRecordFields(fields, values, () => ({ email: "That email is already in use." }));

    expect(result).toEqual({ email: "That email is already in use." });
  });

  test("retains unmatched form-level errors as submit blockers", () => {
    const values: Values = { active: true, email: "ok@example.com", name: "Amina", quantity: "2" };
    const result = validateRecordFields(fields, values, () => ({ _form: "This record cannot be saved yet." }));

    expect(result).toEqual({ _form: "This record cannot be saved yet." });
    expect(hasRecordFormErrors(result)).toBe(true);
  });

  test("returns no summary entries for valid values", () => {
    expect(validateRecordFields(fields, {
      active: true,
      email: "hello@example.com",
      name: "Amina",
      quantity: "3"
    })).toEqual({});
  });
});
