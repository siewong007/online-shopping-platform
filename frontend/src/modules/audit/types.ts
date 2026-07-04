export type AuditEvent = {
  id: number;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  happened_at: string;
};
