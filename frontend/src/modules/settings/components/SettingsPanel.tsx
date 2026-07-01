import { type FormEvent, useState } from "react";

import { formatOrderDate } from "../../../shared/formatters";
import type { SystemSetting, UpdateSystemSettingInput } from "../types";

type SettingsPanelProps = {
  canUpdate: boolean;
  onUpdateSetting: (key: string, input: UpdateSystemSettingInput) => Promise<SystemSetting>;
  settings: SystemSetting[];
};

const categoryLabels: Record<string, string> = {
  general: "General",
  sales: "Sales",
  invoicing: "Invoicing"
};

function groupedByCategory(settings: SystemSetting[]): Record<string, SystemSetting[]> {
  return settings.reduce<Record<string, SystemSetting[]>>((groups, setting) => {
    groups[setting.category] = groups[setting.category]
      ? [...groups[setting.category], setting]
      : [setting];
    return groups;
  }, {});
}

export function SettingsPanel({ canUpdate, onUpdateSetting, settings }: SettingsPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const grouped = groupedByCategory(settings);

  const draftFor = (setting: SystemSetting) => drafts[setting.key] ?? setting.value;

  const handleSave = async (event: FormEvent<HTMLFormElement>, setting: SystemSetting) => {
    event.preventDefault();

    if (!canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot update system settings." });
      return;
    }

    setFeedback(null);
    setSavingKey(setting.key);

    try {
      const updated = await onUpdateSetting(setting.key, { value: draftFor(setting).trim() });
      setDrafts((current) => ({ ...current, [updated.key]: updated.value }));
      setFeedback({ kind: "success", message: `${updated.key} was updated.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update setting."
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">System configuration</p>
          <h3>Tax, invoicing and branding settings</h3>
        </div>
        <span className={`status-pill ${canUpdate ? "live" : ""}`}>
          {canUpdate ? "Writable" : "Read only"}
        </span>
      </div>

      {feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}

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
              {categorySettings.map((setting) => (
                <form
                  className="settings-row"
                  key={setting.key}
                  onSubmit={(event) => void handleSave(event, setting)}
                >
                  <label className="admin-field">
                    {setting.key}
                    <input
                      disabled={!canUpdate}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))
                      }
                      value={draftFor(setting)}
                    />
                  </label>
                  <p className="settings-row-description">{setting.description}</p>
                  <div className="settings-row-footer">
                    <span>Updated {formatOrderDate(setting.updated_at)}</span>
                    <button
                      className="outline-button"
                      disabled={!canUpdate || savingKey === setting.key}
                      type="submit"
                    >
                      {savingKey === setting.key ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
