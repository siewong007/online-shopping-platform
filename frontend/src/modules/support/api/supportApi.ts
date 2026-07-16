import {
  ApiError,
  getCustomerAuthToken,
  postJson,
  putJson,
  requestJson,
  setCustomerAuthToken,
  type AuthScope
} from "../../../shared/api/http";
import type {
  CreateSupportConversationInput,
  CreateSupportConversationResponse,
  SupportAdminConversationThread,
  SupportConversation,
  SupportConversationPage,
  SupportConversationPageResponse,
  SupportConversationStatus,
  SupportConversationUpdateInput,
  SupportInboxConversation,
  SupportMessage,
  SupportMessageListResponse
} from "../types";

export type AdminSupportListParams = {
  before?: number;
  limit?: number;
  status?: SupportConversationStatus;
};

function queryPath(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function createConversationScope(): AuthScope {
  return getCustomerAuthToken() ? "customer" : "public";
}

export function normalizeSupportMessages(payload: SupportMessageListResponse): SupportMessage[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages;
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

export function normalizeSupportConversationPage(
  payload: SupportConversationPageResponse
): SupportConversationPage {
  return Array.isArray(payload) ? { items: payload, next_cursor: null } : payload;
}

async function createSupportConversationWithScope(
  input: CreateSupportConversationInput,
  scope: AuthScope
): Promise<CreateSupportConversationResponse> {
  return postJson<CreateSupportConversationInput, CreateSupportConversationResponse>(
    "/api/support/conversations",
    input,
    scope
  );
}

export async function createSupportConversation(
  input: CreateSupportConversationInput
): Promise<CreateSupportConversationResponse> {
  const scope = createConversationScope();

  try {
    return await createSupportConversationWithScope(input, scope);
  } catch (error) {
    if (scope !== "customer" || !(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    setCustomerAuthToken(null);
    return createSupportConversationWithScope(input, "public");
  }
}

export function fetchSupportConversation(signal?: AbortSignal): Promise<SupportConversation> {
  return requestJson<SupportConversation>("/api/support/conversation", { signal }, "support");
}

export async function fetchSupportMessages(
  afterId?: number,
  signal?: AbortSignal
): Promise<SupportMessage[]> {
  const payload = await requestJson<SupportMessageListResponse>(
    queryPath("/api/support/messages", { after_id: afterId }),
    { signal },
    "support"
  );

  return normalizeSupportMessages(payload);
}

export function sendSupportMessage(body: string): Promise<SupportMessage> {
  return postJson<{ body: string }, SupportMessage>("/api/support/messages", { body }, "support");
}

export function closeSupportConversation(): Promise<SupportConversation> {
  return putJson<{ status: "closed" }, SupportConversation>(
    "/api/support/conversation",
    { status: "closed" },
    "support"
  );
}

export async function fetchAdminSupportConversations(
  params: AdminSupportListParams,
  signal?: AbortSignal
): Promise<SupportConversationPage> {
  const payload = await requestJson<SupportConversationPageResponse>(
    queryPath("/api/admin/support/conversations", params),
    { signal }
  );

  return normalizeSupportConversationPage(payload);
}

export function fetchAdminSupportConversationThread(
  conversationId: number,
  signal?: AbortSignal
): Promise<SupportAdminConversationThread> {
  return requestJson<SupportAdminConversationThread>(
    queryPath(`/api/admin/support/conversations/${conversationId}/messages`, {}),
    { signal }
  );
}

export function sendAdminSupportMessage(
  conversationId: number,
  body: string
): Promise<SupportMessage> {
  return postJson<{ body: string }, SupportMessage>(
    `/api/admin/support/conversations/${conversationId}/messages`,
    { body }
  );
}

export function updateAdminSupportConversation(
  conversationId: number,
  input: SupportConversationUpdateInput
): Promise<SupportConversation> {
  return putJson<SupportConversationUpdateInput, SupportConversation>(
    `/api/admin/support/conversations/${conversationId}`,
    input
  );
}
