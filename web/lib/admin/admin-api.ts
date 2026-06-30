'use client';

export type AdminQuery = Record<string, string | number | boolean | null | undefined>;

export type AdminRole = {
  id?: string;
  name?: string;
  description?: string;
};

export type AdminUser = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: AdminRole | null;
};

export type AdminApiPayload<T> = {
  ok?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  errors?: Array<{
    message?: string;
  }>;
};

export class AdminApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const adminLoginPath = '/admin/login';

export const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== adminLoginPath) {
    window.location.href = adminLoginPath;
  }
};

const parseJson = async <T>(response: Response): Promise<AdminApiPayload<T> | null> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as AdminApiPayload<T>;
  } catch {
    return { error: { code: 'INVALID_JSON', message: text } };
  }
};

const getErrorMessage = <T>(payload: AdminApiPayload<T> | null, fallback: string) => {
  if (payload?.error?.message) return payload.error.message;
  if (payload?.errors?.[0]?.message) return payload.errors[0].message;
  return fallback;
};

export const withQuery = (url: string, params: AdminQuery = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const search = query.toString();
  return search ? `${url}?${search}` : url;
};

export async function adminFetch<T>(url: string, options: RequestInit = {}): Promise<AdminApiPayload<T>> {
  const headers = new Headers(options.headers);
  const hasFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !hasFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers,
  });
  const payload = await parseJson<T>(response);

  if (response.status === 401) {
    redirectToLogin();
    throw new AdminApiError('登录已失效，请重新登录', response.status, payload);
  }

  if (!response.ok) {
    throw new AdminApiError(getErrorMessage(payload, '请求失败，请稍后重试'), response.status, payload);
  }

  return payload || {};
}

export const AdminApi = {
  adminFetch,
  redirectToLogin,
  login: (email: string, password: string) => adminFetch('/admin-api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  logout: () => adminFetch('/admin-api/logout', { method: 'POST' }),
  me: () => adminFetch<AdminUser>('/admin-api/me'),
  channels: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/channels', params)),
  articles: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/articles', params)),
  article: (id: string, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/articles/${encodeURIComponent(id)}`, params)),
  articlePreviewLink: (id: string, params: AdminQuery = {}) => adminFetch<{ url?: string }>(withQuery(`/admin-api/articles/${encodeURIComponent(id)}/preview-link`, params)),
  createArticle: (payload: unknown, params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/articles', params), {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateArticle: (id: string, payload: unknown, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/articles/${encodeURIComponent(id)}`, params), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteArticle: (id: string, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/articles/${encodeURIComponent(id)}`, params), {
    method: 'DELETE',
  }),
  setArticleStatus: (id: string, action: string, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/articles/${encodeURIComponent(id)}/${action}`, params), {
    method: 'PATCH',
  }),
  uploadFile: (formData: FormData) => adminFetch('/admin-api/files', {
    method: 'POST',
    body: formData,
  }),
  categories: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/categories', params)),
  category: (id: string, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/categories/${encodeURIComponent(id)}`, params)),
  createCategory: (payload: unknown, params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/categories', params), {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateCategory: (id: string, payload: unknown, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/categories/${encodeURIComponent(id)}`, params), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteCategory: (id: string, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/categories/${encodeURIComponent(id)}`, params), {
    method: 'DELETE',
  }),
  setCategoryEnabled: (id: string, enabled: boolean, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/categories/${encodeURIComponent(id)}/${enabled ? 'enable' : 'disable'}`, params), {
    method: 'PATCH',
  }),
  categoryUsage: (id: string, params: AdminQuery = {}) => adminFetch(withQuery(`/admin-api/categories/${encodeURIComponent(id)}/usage`, params)),
  pageModules: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/page-modules', params)),
  pageModulesGrouped: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/page-modules/grouped', params)),
  updatePageModule: (id: string, payload: unknown) => adminFetch(`/admin-api/page-modules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  contentModuleTree: () => adminFetch('/admin-api/content-modules/tree'),
  contentModule: (moduleCode: string) => adminFetch(`/admin-api/content-modules/${encodeURIComponent(moduleCode)}`),
  pageContent: (moduleCode: string) => adminFetch(`/admin-api/page-contents/${encodeURIComponent(moduleCode)}`),
  savePageContent: (moduleCode: string, payload: unknown) => adminFetch(`/admin-api/page-contents/${encodeURIComponent(moduleCode)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  pageContentItems: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/page-content-items', params)),
  createPageContentItem: (payload: unknown) => adminFetch('/admin-api/page-content-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updatePageContentItem: (id: string, payload: unknown) => adminFetch(`/admin-api/page-content-items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  disablePageContentItem: (id: string) => adminFetch(`/admin-api/page-content-items/${encodeURIComponent(id)}/disable`, {
    method: 'PATCH',
  }),
};
