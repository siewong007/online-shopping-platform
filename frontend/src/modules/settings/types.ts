export type SystemSetting = {
  key: string;
  value: string;
  value_type: string;
  category: string;
  description: string;
  updated_at: string;
};

export type UpdateSystemSettingInput = {
  value: string;
};
