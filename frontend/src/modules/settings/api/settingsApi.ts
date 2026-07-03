import { fallbackSystemSettings } from "../../../data/fallback";
import { fetchJson, putJson } from "../../../shared/api/http";
import type { SystemSetting, UpdateSystemSettingInput } from "../types";

export function fetchSystemSettings(): Promise<SystemSetting[]> {
  return fetchJson("/api/admin/settings", fallbackSystemSettings);
}

export function updateSystemSetting(
  key: string,
  input: UpdateSystemSettingInput
): Promise<SystemSetting> {
  return putJson<UpdateSystemSettingInput, SystemSetting>(
    `/api/admin/settings/${encodeURIComponent(key)}`,
    input
  );
}
