export type AdminListParams = {
  limit?: number;
  before?: number;
};

export type PagedResponse<T> = {
  items: T[];
  next_cursor: number | null;
};

export function adminListPath(path: string, params: AdminListParams): string {
  const query = new URLSearchParams();
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.before !== undefined) {
    query.set("before", String(params.before));
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function normalizePagedResponse<T>(
  payload: T[] | PagedResponse<T>
): PagedResponse<T> {
  return Array.isArray(payload) ? { items: payload, next_cursor: null } : payload;
}
