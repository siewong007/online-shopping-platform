import { type FormEvent, useState } from "react";

import { formatOrderDate } from "../../../shared/formatters";
import { useNotifications } from "../../../shared/notifications";
import type { SystemSetting, UpdateSystemSettingInput } from "../types";

type SettingsPanelProps = {
  canUpdate: boolean;
  onUpdateSetting: (key: string, input: UpdateSystemSettingInput) => Promise<SystemSetting>;
  settings: SystemSetting[];
};

const categoryLabels: Record<string, string> = {
  general: "General",
  sales: "Sales",
  invoicing: "Invoicing",
  shipping: "Shipping"
};

const settingAcronyms: Record<string, string> = {
  bps: "BPS",
  id: "ID",
  ssm: "SSM",
  url: "URL",
  whatsapp: "WhatsApp"
};

function formatSettingTitle(key: string): string {
  const suffix = key.includes(".") ? key.slice(key.indexOf(".") + 1) : key;
  return suffix
    .split(/[._-]+/)
    .filter(Boolean)
    .map(
      (part) =>
        settingAcronyms[part.toLowerCase()] ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    )
    .join(" ");
}

function groupedByCategory(settings: SystemSetting[]): Record<string, SystemSetting[]> {
  return settings.reduce<Record<string, SystemSetting[]>>((groups, setting) => {
    groups[setting.category] = groups[setting.category]
      ? [...groups[setting.category], setting]
      : [setting];
    return groups;
  }, {});
}

function validateSettingValue(setting: SystemSetting, value: string): string | null {
  if (value === "") {
    return "Setting value cannot be empty.";
  }

  if (setting.key.startsWith("shipping.") && setting.key.endsWith("_cents")) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000000) {
      return "Shipping rates must be whole cents between 0 and 100000000.";
    }
    return null;
  }

  if (setting.value_type === "bool" && value !== "true" && value !== "false") {
    return `${setting.key} must be true or false.`;
  }

  switch (setting.key) {
    case "sales.default_tax_rate_bps": {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) {
        return "Tax rate must be a whole number between 0 and 10000 basis points.";
      }
      return null;
    }
    case "invoicing.payment_terms_days": {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
        return "Payment terms must be a whole number between 0 and 365 days.";
      }
      return null;
    }
    case "invoicing.next_sequence": {
      const parsed = Number(value);
      const current = Number(setting.value);
      if (!Number.isInteger(parsed) || parsed <= current) {
        return `Next sequence must be a whole number greater than ${current}.`;
      }
      return null;
    }
    case "general.currency_code":
      if (!/^[A-Z]{3}$/.test(value)) {
        return "Currency code must be three uppercase letters (e.g. MYR).";
      }
      return null;
    default:
      if (setting.value_type === "int" && !Number.isInteger(Number(value))) {
        return `${setting.key} must be a whole number.`;
      }
      return null;
  }
}

export function SettingsPanel({ canUpdate, onUpdateSetting, settings }: SettingsPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const grouped = groupedByCategory(settings);

  const draftFor = (setting: SystemSetting) => drafts[setting.key] ?? setting.value;

  const handleSave = async (event: FormEvent<HTMLFormElement>, setting: SystemSetting) => {
    event.preventDefault();

    if (!canUpdate) {
      notify({ severity: "error", title: "Setting not updated", message: "The active role cannot update system settings.", scope: "settings", dedupeKey: "settings:update:permission" });
      return;
    }

    const value = draftFor(setting).trim();
    const validationError = validateSettingValue(setting, value);
    if (validationError) {
      notify({ severity: "warning", title: "Check the setting value", message: validationError, scope: "settings", dedupeKey: `settings:${setting.key}:validation` });
      return;
    }

    setSavingKey(setting.key);

    try {
      const updated = await onUpdateSetting(setting.key, { value });
      setDrafts((current) => ({ ...current, [updated.key]: updated.value }));
      notify({ severity: "success", title: "Setting updated", message: `${updated.key} was updated successfully.`, scope: "settings", dedupeKey: `settings:${updated.key}:update:success` });
    } catch (error) {
      notifyError(error, { operation: "update system setting", scope: "settings", dedupeKey: `settings:${setting.key}:update:error` });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">System configuration</p>
          <h3>Tax, invoicing, shipping and branding settings</h3>
        </div>
        <span className={`status-pill ${canUpdate ? "live" : ""}`}>
          {canUpdate ? "Writable" : "Read only"}
        </span>
      </div>

      <div className="settings-category-grid">
        {Object.entries(grouped).map(([category, categorySettings]) => (
          <article className="dashboard-panel" key={category}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">{category}</p>
                <h3>{categoryLabels[category] ?? category}</h3>
              </div>
            </div>

            <div className="settings-row-list">
              {categorySettings.map((setting) => {
                const draftValue = draftFor(setting);
                const isDirty = draftValue !== setting.value;

                return (
                  <form
                    className="settings-row"
                    key={setting.key}
                    onSubmit={(event) => void handleSave(event, setting)}
                  >
                    <label className="admin-field">
                      <span>
                        <span className="setting-title">{formatSettingTitle(setting.key)}</span>
                        <code className="setting-key">{setting.key}</code>
                      </span>
                      {setting.value_type === "bool" ? (
                        <select
                          disabled={!canUpdate}
                          onChange={(event) =>
                            setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))
                          }
                          value={draftValue}
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : (
                        <input
                          disabled={!canUpdate}
                          min={setting.key.endsWith("_cents") ? 0 : undefined}
                          onChange={(event) =>
                            setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))
                          }
                          type={setting.value_type === "int" ? "number" : "text"}
                          value={draftValue}
                        />
                      )}
                    </label>
                    <p className="settings-row-description">{setting.description}</p>
                    <div className="settings-row-footer">
                      <div className="admin-actions" style={{ alignItems: "center", gap: "0.5rem" }}>
                        <span>Updated {formatOrderDate(setting.updated_at)}</span>
                        {isDirty ? (
                          <strong className="sales-row-dirty" style={{ marginTop: 0 }}>
                            Modified
                          </strong>
                        ) : null}
                      </div>
                      <button
                        className={isDirty ? "solid-button" : "outline-button"}
                        disabled={!canUpdate || !isDirty || savingKey === setting.key}
                        type="submit"
                      >
                        {savingKey === setting.key ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
