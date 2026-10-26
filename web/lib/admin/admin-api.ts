'use client';

export type AdminQuery = Record<string, string | number | boolean | null | undefined>;

export type AdminRole = {
  id?: string;
  name?: string;
  description?: string;
  admin_access?: boolean;
  app_access?: boolean;
};

export type AdminUser = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  role?: AdminRole | null;
  menu_permissions?: string[];
  is_super_admin?: boolean;
};

export type DashboardStats = {
  news_articles?: number;
  news_categories?: number;
  notice_articles?: number;
  notice_categories?: number;
};

export type AdminTopic = {
  id: string;
  slug: string;
  module_code: string;
  title: string;
  subtitle?: string;
  cover?: string;
  summary?: string;
  content?: string;
  status: string;
  sort: number;
  article_count?: number;
};

export type AdminTopicArticle = {
  id: string;
  article_id: string;
  title: string;
  status?: string;
  publish_at?: string;
  cover?: string;
  sort: number;
  item_status?: string;
  missing?: boolean;
};

export type AdminTopicCandidate = {
  id: string;
  title: string;
  status?: string;
  publish_at?: string;
  cover?: string;
};

export type AdminProject = {
  id: string;
  name: string;
  type: string;
  location: string;
  summary: string;
  progress: string;
  image?: string;
  detail: string;
  map_x?: number | null;
  map_y?: number | null;
  sort: number;
  status: string;
};

export type AdminMessageStatus = 'pending' | 'processing' | 'replied' | 'closed';

export type AdminMessageCategory = 'consult' | 'suggest' | 'complaint' | 'report' | 'other';

export type AdminMessageListItem = {
  id: string;
  name: string;
  phone_masked: string;
  email: string;
  category: AdminMessageCategory;
  category_label: string;
  content_excerpt: string;
  status: AdminMessageStatus;
  status_label: string;
  handler: string;
  handled_at: string;
  track_code: string;
  created_at: string;
};

export type AdminMessage = {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: AdminMessageCategory;
  category_label: string;
  content: string;
  status: AdminMessageStatus;
  status_label: string;
  reply: string;
  note: string;
  handler: string;
  handled_at: string;
  track_code: string;
  client_ip: string;
  source_path: string;
  created_at: string;
};

export type AdminManagedLink = {
  id: string;
  title: string;
  url: string;
  position: string;
  sort: number;
  status: string;
};

export type AdminBusinessSector = {
  id: string;
  name: string;
  slug: string;
  cover?: string;
  intro: string;
  sort: number;
  status: string;
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
  ssoLogin: (key: string, targetUrl?: string) => adminFetch<{ targetUrl?: string }>('/admin-api/sso-login', {
    method: 'POST',
    body: JSON.stringify({ key, targetUrl }),
  }),
  logout: () => adminFetch('/admin-api/logout', { method: 'POST' }),
  me: () => adminFetch<AdminUser>('/admin-api/me'),
  dashboardStats: () => adminFetch<DashboardStats>('/admin-api/dashboard/stats'),
  users: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/users', params)),
  createUser: (payload: unknown) => adminFetch('/admin-api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateUser: (id: string, payload: unknown) => adminFetch(`/admin-api/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  disableUser: (id: string) => adminFetch(`/admin-api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
  roles: () => adminFetch<AdminRole[]>('/admin-api/roles'),
  permissionsOverview: () => adminFetch('/admin-api/permissions'),
  updateUserPermissions: (userId: string, menuKeys: string[]) => adminFetch(`/admin-api/permissions/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ menu_keys: menuKeys }),
  }),
  channels: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/channels', params)),
  navigation: () => adminFetch('/admin-api/navigation'),
  createNavigationItem: (payload: unknown) => adminFetch('/admin-api/navigation', { method: 'POST', body: JSON.stringify(payload) }),
  updateNavigationItem: (id: string, payload: unknown) => adminFetch(`/admin-api/navigation/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteNavigationItem: (id: string) => adminFetch(`/admin-api/navigation/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  articleOwnership: () => adminFetch('/admin-api/article-ownership'),
  updateArticleOwnership: (id: string, companyId: string) => adminFetch(`/admin-api/article-ownership/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ related_company: companyId || null }) }),
  companies: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/companies', params)),
  createCompany: (payload: unknown) => adminFetch('/admin-api/companies', { method: 'POST', body: JSON.stringify(payload) }),
  updateCompany: (id: string, payload: unknown) => adminFetch(`/admin-api/companies/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCompany: (id: string) => adminFetch(`/admin-api/companies/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  topics: () => adminFetch<AdminTopic[]>('/admin-api/topics'),
  projects: () => adminFetch<AdminProject[]>('/admin-api/projects'),
  quickLinks: () => adminFetch<AdminManagedLink[]>('/admin-api/quick-links'),
  createQuickLink: (payload: unknown) => adminFetch<AdminManagedLink>('/admin-api/quick-links', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateQuickLink: (id: string, payload: unknown) => adminFetch<AdminManagedLink>(`/admin-api/quick-links/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteQuickLink: (id: string) => adminFetch(`/admin-api/quick-links/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  friendLinks: () => adminFetch<AdminManagedLink[]>('/admin-api/friend-links'),
  createFriendLink: (payload: unknown) => adminFetch<AdminManagedLink>('/admin-api/friend-links', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateFriendLink: (id: string, payload: unknown) => adminFetch<AdminManagedLink>(`/admin-api/friend-links/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteFriendLink: (id: string) => adminFetch(`/admin-api/friend-links/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  businessSectors: () => adminFetch<AdminBusinessSector[]>('/admin-api/business-sectors'),
  createBusinessSector: (payload: unknown) => adminFetch<AdminBusinessSector>('/admin-api/business-sectors', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateBusinessSector: (id: string, payload: unknown) => adminFetch<AdminBusinessSector>(`/admin-api/business-sectors/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteBusinessSector: (id: string) => adminFetch(`/admin-api/business-sectors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  messages: (params: AdminQuery = {}) => adminFetch(withQuery('/admin-api/messages', params)),
  message: (id: string) => adminFetch<AdminMessage>(`/admin-api/messages/${encodeURIComponent(id)}`),
  updateMessage: (id: string, payload: unknown) => adminFetch<AdminMessage>(`/admin-api/messages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  createProject: (payload: unknown) => adminFetch<AdminProject>('/admin-api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateProject: (id: string, payload: unknown) => adminFetch<AdminProject>(`/admin-api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  topic: (id: string) => adminFetch<AdminTopic>(`/admin-api/topics/${encodeURIComponent(id)}`),
  createTopic: (payload: unknown) => adminFetch<AdminTopic>('/admin-api/topics', { method: 'POST', body: JSON.stringify(payload) }),
  updateTopic: (id: string, payload: unknown) => adminFetch<AdminTopic>(`/admin-api/topics/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTopic: (id: string) => adminFetch(`/admin-api/topics/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  topicArticles: (id: string) => adminFetch<{ topic: AdminTopic; items: AdminTopicArticle[]; candidates: AdminTopicCandidate[] }>(`/admin-api/topics/${encodeURIComponent(id)}/articles`),
  addTopicArticle: (id: string, articleId: string) => adminFetch(`/admin-api/topics/${encodeURIComponent(id)}/articles`, { method: 'POST', body: JSON.stringify({ article_id: articleId }) }),
  updateTopicArticle: (id: string, itemId: string, payload: unknown) => adminFetch(`/admin-api/topics/${encodeURIComponent(id)}/articles/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTopicArticle: (id: string, itemId: string) => adminFetch(`/admin-api/topics/${encodeURIComponent(id)}/articles/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),
  reorderTopicArticles: (id: string, itemIds: string[]) => adminFetch(`/admin-api/topics/${encodeURIComponent(id)}/articles/order`, { method: 'PATCH', body: JSON.stringify({ item_ids: itemIds }) }),
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
