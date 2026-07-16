export type SupportConversationStatus = "open" | "pending" | "closed";

export type SupportMessageAuthorKind = "guest" | "admin";

export type SupportConversation = {
  id: number;
  guest_name: string;
  guest_email: string;
  customer_account_id: number | null;
  assigned_admin_user_id: number | null;
  assigned_admin_display_name: string | null;
  status: SupportConversationStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

export type SupportInboxConversation = SupportConversation & {
  last_message_preview: string | null;
  last_message_author_kind: SupportMessageAuthorKind | null;
};

export type SupportMessage = {
  id: number;
  conversation_id: number;
  author_kind: SupportMessageAuthorKind;
  admin_user_id: number | null;
  body: string;
  created_at: string;
};

export type CreateSupportConversationInput = {
  guest_name: string;
  guest_email: string;
  message: string;
};

export type CreateSupportConversationResponse = {
  token: string;
  conversation: SupportConversation;
  messages: SupportMessage[];
};

export type SupportConversationUpdateInput = {
  status?: SupportConversationStatus;
  assigned_admin_user_id?: number | null;
};

export type SupportMessageListResponse =
  | SupportMessage[]
  | { items?: SupportMessage[]; messages?: SupportMessage[] };

export type SupportConversationPage = {
  items: SupportInboxConversation[];
  next_cursor: number | null;
};

export type SupportConversationPageResponse = SupportInboxConversation[] | SupportConversationPage;

export type SupportAdminConversationThread = {
  conversation: SupportConversation;
  messages: SupportMessage[];
};
