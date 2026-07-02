import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { allAdminMenuKeys, adminMenuItems, menuKeysWithDashboard, type AdminMenuKey } from '@/lib/admin/menu-permissions';
import { createArticlePreviewPath } from '@/lib/preview/article-preview';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

let localDirectusEnvCache: Record<string, string> | null = null;

const parseEnvLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) return null;
  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return key ? { key, value } : null;
};

const getLocalDirectusEnv = () => {
  if (localDirectusEnvCache) return localDirectusEnvCache;
  localDirectusEnvCache = {};
  const candidates = [
    path.resolve(process.cwd(), '.env.directus'),
    path.resolve(process.cwd(), '..', '.env.directus'),
  ];
  const envPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!envPath) return localDirectusEnvCache;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const entry = parseEnvLine(line);
    if (entry) localDirectusEnvCache![entry.key] = entry.value;
  });
  return localDirectusEnvCache;
};

const getEnvValue = (key: string) => process.env[key] || getLocalDirectusEnv()[key] || '';

const directusUrl = (getEnvValue('DIRECTUS_URL') || 'http://localhost:8055').replace(/\/+$/, '');
const sessionSecret = getEnvValue('ADMIN_SESSION_SECRET') || 'local-dev-admin-session-secret-change-before-production';
const sessionCookieName = 'gzjt_admin_session';
const sessionMaxAgeSeconds = 60 * 60 * 8;

type AdminSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email?: string;
};

type DirectusAdminUser = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  role?: string | {
    id?: string;
    name?: string;
    description?: string;
  } | null;
};

type CountResponse = {
  meta?: {
    filter_count?: number;
  };
};

const articleStatuses = new Set(['draft', 'published', 'archived']);
const categoryStatuses = new Set(['enabled', 'disabled']);
const categoryTypes = new Set(['list', 'page', 'link', 'module', 'news', 'notice']);
const pageModuleDevStatuses = new Set(['developing', 'enabled', 'disabled']);
const pageModuleStatuses = new Set(['enabled', 'disabled']);
const pageContentStatuses = new Set(['draft', 'published', 'archived']);
const pageContentItemTypes = new Set(['timeline', 'leader', 'org_node', 'link', 'image']);
const pageContentItemStatuses = new Set(['enabled', 'disabled']);
const directusUserStatuses = new Set(['active', 'invited', 'draft', 'suspended', 'archived']);
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedDocumentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const allowedDocumentExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const maxUploadBytes = 50 * 1024 * 1024;
const pageModuleFields = 'id,module_title,module_code,parent_title,parent_code,route_path,content_type,admin_enabled,dev_status,placeholder_text,remark,sort,status';
const directusUserFields = 'id,email,first_name,last_name,status,role';
const directusUserListFields = 'id,email,first_name,last_name,status,role.id,role.name,role.description';
const directusRoleFields = 'id,name,description';

const globalForAdminSessions = globalThis as typeof globalThis & {
  __gzjtAdminSessions?: Map<string, AdminSession>;
  __gzjtServiceAuthCache?: { accessToken: string; expiresAt: number };
};

const adminSessions = globalForAdminSessions.__gzjtAdminSessions || new Map<string, AdminSession>();
globalForAdminSessions.__gzjtAdminSessions = adminSessions;
const serviceAuthCache = globalForAdminSessions.__gzjtServiceAuthCache || { accessToken: '', expiresAt: 0 };
globalForAdminSessions.__gzjtServiceAuthCache = serviceAuthCache;

const getAdminApiBase = () => (
  process.env.ADMIN_API_BASE
  || process.env.ADMIN_API_URL
  || ''
).replace(/\/+$/, '');

const getRoutePath = async (context: RouteContext) => {
  const { path = [] } = await context.params;
  return path.join('/');
};

const buildTargetUrl = async (request: NextRequest, context: RouteContext) => {
  const base = getAdminApiBase();
  if (!base) return '';
  const { path = [] } = await context.params;
  const target = new URL(`/admin-api/${path.map(encodeURIComponent).join('/')}`, base);
  target.search = request.nextUrl.search;
  return target.toString();
};

const copyRequestHeaders = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  return headers;
};

const signSessionId = (sessionId: string) => crypto
  .createHmac('sha256', sessionSecret)
  .update(sessionId)
  .digest('base64url');

const encodeSessionCookie = (sessionId: string) => `${sessionId}.${signSessionId(sessionId)}`;

const decodeSessionCookie = (cookieValue?: string) => {
  if (!cookieValue || !cookieValue.includes('.')) return null;
  const [sessionId, signature] = cookieValue.split('.');
  if (!sessionId || !signature) return null;
  const expected = signSessionId(sessionId);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  return sessionId;
};

const getSession = (request: NextRequest) => {
  const rawCookie = request.cookies.get(sessionCookieName)?.value;
  const sessionId = decodeSessionCookie(rawCookie);
  if (!sessionId) return null;
  const session = adminSessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(sessionId);
    return null;
  }
  return { sessionId, ...session };
};

const createSessionResponse = (payload: unknown, status: number, sessionId: string) => {
  const response = NextResponse.json(payload, { status });
  response.cookies.set({
    name: sessionCookieName,
    value: encodeSessionCookie(sessionId),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  });
  return response;
};

const clearSessionResponse = () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: sessionCookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
};

const directusRequest = async <T>(pathname: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${directusUrl}${pathname}`, {
    ...init,
    cache: 'no-store',
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.errors?.[0]?.message || payload?.message || response.statusText || 'Directus request failed';
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  return payload as T;
};

const buildDirectusPath = (pathname: string, params: Record<string, string | number | boolean | null | undefined> = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const directusJsonRequest = <T>(pathname: string, token: string, method = 'GET', body?: unknown) => directusRequest<T>(pathname, {
  method,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

const getServiceDirectusToken = async (fallbackToken?: string) => {
  const configuredToken = getEnvValue('DIRECTUS_TOKEN');
  if (configuredToken) return configuredToken;
  if (serviceAuthCache.accessToken && serviceAuthCache.expiresAt > Date.now() + 30_000) return serviceAuthCache.accessToken;
  const email = getEnvValue('DIRECTUS_EMAIL') || getEnvValue('ADMIN_EMAIL');
  const password = getEnvValue('DIRECTUS_PASSWORD') || getEnvValue('ADMIN_PASSWORD');
  if (!email || !password) {
    if (fallbackToken) return fallbackToken;
    throw Object.assign(new Error('Directus service credentials are not configured'), { status: 500 });
  }
  const loginResult = await directusRequest<{ data?: { access_token?: string; expires?: number } }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const accessToken = loginResult.data?.access_token || '';
  if (!accessToken) throw Object.assign(new Error('Directus service login did not return an access token'), { status: 500 });
  const expiresRaw = Number(loginResult.data?.expires || 300);
  const expiresMs = expiresRaw > 86_400 ? expiresRaw : expiresRaw * 1000;
  serviceAuthCache.accessToken = accessToken;
  serviceAuthCache.expiresAt = Date.now() + Math.max(60_000, expiresMs);
  return accessToken;
};

const directusFormRequest = async <T>(pathname: string, token: string, formData: FormData): Promise<T> => {
  const response = await fetch(`${directusUrl}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    cache: 'no-store',
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.errors?.[0]?.message || payload?.message || response.statusText || 'Directus upload failed';
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  return payload as T;
};

const requireSession = (request: NextRequest) => {
  const session = getSession(request);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin login required' } },
        { status: 401 },
      ),
    };
  }
  return { session, response: null };
};

const isSuperAdminUser = (user: DirectusAdminUser | null | undefined) => {
  const role = typeof user?.role === 'object' && user.role ? user.role : null;
  const roleName = (role?.name || '').trim().toLowerCase();
  const adminEmail = getEnvValue('ADMIN_EMAIL').trim().toLowerCase();
  const userEmail = (user?.email || '').trim().toLowerCase();
  return Boolean(
    roleName === 'administrator'
    || roleName === '系统管理员'
    || userEmail === 'admin@example.com'
    || (!!adminEmail && userEmail === adminEmail)
  );
};

const unwrapDirectusData = <T,>(payload: T | { data?: T } | null | undefined): T | null => {
  if (!payload) return null;
  if (typeof payload === 'object' && 'data' in payload) return (payload as { data?: T }).data || null;
  return payload as T;
};

const enrichUserRole = async (token: string, user: DirectusAdminUser | null) => {
  if (!user) return null;
  if (!user.role || typeof user.role === 'object') return user;
  try {
    const role = await directusJsonRequest<{ data?: DirectusAdminUser['role'] }>(
      buildDirectusPath(`/roles/${encodeURIComponent(user.role)}`, { fields: directusRoleFields }),
      await getServiceDirectusToken(token),
    );
    return { ...user, role: role.data || user.role };
  } catch {
    return user;
  }
};

const getUserBySessionEmail = async (token: string, email?: string) => {
  const safeEmail = (email || '').trim();
  if (!safeEmail) return null;
  try {
    const serviceToken = await getServiceDirectusToken(token);
    return await findAdminUserByEmail(serviceToken, safeEmail);
  } catch {
    return null;
  }
};

const getCurrentDirectusUser = async (token: string, email?: string) => {
  try {
    const me = await directusRequest<DirectusAdminUser | { data?: DirectusAdminUser }>(buildDirectusPath('/users/me', { fields: directusUserFields }), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = unwrapDirectusData<DirectusAdminUser>(me);
    if (user?.id && user?.email) return enrichUserRole(token, user);
  } catch {
    // 普通内容角色可能不能读取 directus_users 的全部字段，继续用登录邮箱和服务账号补全。
  }

  const userByEmail = await getUserBySessionEmail(token, email);
  if (userByEmail) return enrichUserRole(token, userByEmail);

  try {
    const fallback = await directusRequest<DirectusAdminUser | { data?: DirectusAdminUser }>('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = unwrapDirectusData<DirectusAdminUser>(fallback);
    if (user?.id || user?.email) return enrichUserRole(token, user);
  } catch {
    // 由调用方按空用户处理。
  }

  return email ? { email } : null;
};

const findUserMenuPermission = async (token: string, userId: string) => {
  const result = await directusJsonRequest<{ data?: Array<{ id?: string | number; menu_keys?: unknown; status?: string }> }>(
    buildDirectusPath('/items/admin_menu_permissions', {
      fields: 'id,user,menu_keys,status',
      limit: 1,
      'filter[user][_eq]': userId,
    }),
    token,
  );
  return Array.isArray(result.data) ? result.data[0] || null : null;
};

const isAdminMenuPermissionCollectionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('admin_menu_permissions') && (
    message.includes("does not exist")
    || message.includes("don't have permission")
    || message.includes('permission')
  );
};

const adminMenuPermissionSetupError = () => Object.assign(
  new Error('后台菜单权限集合 admin_menu_permissions 尚未初始化。请先运行 scripts/directus/bootstrap-directus.mjs 后再创建后台账号。'),
  { status: 500 },
);

const isDirectusUniqueEmailError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('directus_users') && message.includes('email') && message.includes('unique');
};

const getUserMenuKeys = async (token: string, user: DirectusAdminUser | null) => {
  if (isSuperAdminUser(user)) return allAdminMenuKeys;
  if (!user?.id) return ['dashboard'];
  try {
    const serviceToken = await getServiceDirectusToken(token);
    const permission = await findUserMenuPermission(serviceToken, user.id);
    if (!permission || permission.status === 'disabled') return allAdminMenuKeys;
    return menuKeysWithDashboard(permission.menu_keys);
  } catch {
    return ['dashboard'];
  }
};

const decorateAdminUser = async (token: string, user: DirectusAdminUser | null) => {
  const menuPermissions = await getUserMenuKeys(token, user);
  return user ? {
    ...user,
    menu_permissions: menuPermissions,
    is_super_admin: isSuperAdminUser(user),
  } : null;
};

const getRouteMenuCandidates = (route: string, request: NextRequest): AdminMenuKey[] => {
  const [root, second] = route.split('/');
  const scope = getAdminScope(request);
  if (root === 'users' || root === 'roles') return ['users'];
  if (root === 'permissions') return ['permissions'];
  if (root === 'channels') {
    return scope === 'notice'
      ? ['noticeCategories', 'noticeArticles', 'noticeEdit']
      : ['categories', 'articles', 'articleEdit'];
  }
  if (root === 'articles') {
    return scope === 'notice' ? ['noticeArticles', 'noticeEdit'] : ['articles', 'articleEdit'];
  }
  if (root === 'categories') return scope === 'notice' ? ['noticeCategories'] : ['categories'];
  if (root === 'files') return ['articleEdit', 'noticeEdit', 'content'];
  if (root === 'assets') return ['articles', 'articleEdit', 'noticeArticles', 'noticeEdit', 'content'];
  if (root === 'page-modules' || root === 'content-modules' || root === 'page-contents' || root === 'page-content-items') return ['content'];
  if (root === 'page-modules' && second === 'grouped') return ['content'];
  return ['dashboard'];
};

const requireMenuAccess = async (request: NextRequest, route: string, session: AdminSession) => {
  const currentUser = await getCurrentDirectusUser(session.accessToken, session.email);
  if (isSuperAdminUser(currentUser)) return null;
  const allowed = await getUserMenuKeys(session.accessToken, currentUser);
  const allowedSet = new Set(allowed);
  const candidates = getRouteMenuCandidates(route, request);
  const hasAccess = candidates.some((key) => allowedSet.has(key));
  if (hasAccess) return null;
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message: '当前账号没有访问该后台模块的权限。' } },
    { status: 403 },
  );
};

const getAdminScope = (request: NextRequest) => request.nextUrl.searchParams.get('scope') === 'notice' ? 'notice' : 'news';

const normalizePagination = (rawPage: string | null, rawLimit: string | null) => {
  const page = Math.max(1, Number.parseInt(rawPage || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(rawLimit || '10', 10) || 10));
  return { page, limit };
};

const getChannelsPath = (scope = 'news') => {
  const params: Record<string, string | number | boolean> = {
    fields: 'id,name,slug,type,path,status,sort,is_news_category',
    sort: 'sort,name',
    limit: 100,
    'filter[status][_eq]': 'enabled',
  };
  if (scope === 'notice') {
    params['filter[_or][0][type][_eq]'] = 'notice';
    params['filter[_or][1][path][_starts_with]'] = '/disclosure';
  } else {
    params['filter[is_news_category][_eq]'] = true;
  }
  return buildDirectusPath('/items/channels', params);
};

const getNoticeChannels = async (token: string) => {
  const serviceToken = await getServiceDirectusToken(token);
  const result = await directusJsonRequest<{ data?: Array<{ id?: string; slug?: string; name?: string }> }>(getChannelsPath('notice'), serviceToken);
  return Array.isArray(result.data) ? result.data : [];
};

const buildCategoryListPath = (request: NextRequest) => {
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const status = (request.nextUrl.searchParams.get('status') || '').trim();
  const scope = getAdminScope(request);
  const params: Record<string, string | number | boolean> = {
    fields: 'id,name,slug,type,path,sort,visible,status,is_news_category,description,parent.id,parent.name',
    sort: 'sort,name',
    limit: 100,
  };

  if (scope === 'notice') {
    params['filter[_and][0][_or][0][type][_eq]'] = 'notice';
    params['filter[_and][0][_or][1][path][_starts_with]'] = '/disclosure';
  } else {
    params['filter[_and][0][_or][0][is_news_category][_eq]'] = true;
    params['filter[_and][0][_or][1][type][_eq]'] = 'news';
  }
  if (keyword) {
    params['filter[_and][1][_or][0][name][_contains]'] = keyword;
    params['filter[_and][1][_or][1][slug][_contains]'] = keyword;
    params['filter[_and][1][_or][2][description][_contains]'] = keyword;
  }
  if (status && categoryStatuses.has(status)) {
    params[keyword ? 'filter[_and][2][status][_eq]' : 'filter[_and][1][status][_eq]'] = status;
  }
  return buildDirectusPath('/items/channels', params);
};

const getCategoryDetailPath = (id: string) => buildDirectusPath(`/items/channels/${encodeURIComponent(id)}`, {
  fields: 'id,name,slug,type,path,sort,visible,status,is_news_category,description,parent.id,parent.name',
});

const normalizeCategoryInput = (body: Record<string, unknown>, isCreate = false, scope = 'news') => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!name) throw Object.assign(new Error('name is required'), { status: 400 });
  if (!slug) throw Object.assign(new Error('slug is required'), { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw Object.assign(new Error('slug must use lowercase letters, numbers, and hyphens'), { status: 400 });
  }
  const status = typeof body.status === 'string' && categoryStatuses.has(body.status) ? body.status : 'enabled';
  const sort = Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0;
  const payload: Record<string, unknown> = scope === 'notice'
    ? {
        name,
        slug,
        type: 'notice',
        path: typeof body.path === 'string' && body.path.trim() ? body.path.trim() : `/disclosure/${slug}`,
        sort,
        visible: typeof body.visible === 'boolean' ? body.visible : status === 'enabled',
        status,
        description: typeof body.description === 'string' ? body.description.trim() : '',
      }
    : {
        name,
        slug,
        type: typeof body.type === 'string' && categoryTypes.has(body.type) ? body.type : 'list',
        path: typeof body.path === 'string' && body.path.trim() ? body.path.trim() : `/channels/${slug}`,
        sort,
        visible: typeof body.visible === 'boolean' ? body.visible : status === 'enabled',
        status,
        is_news_category: true,
        description: typeof body.description === 'string' ? body.description.trim() : '',
      };
  if (body.parent) payload.parent = body.parent;
  if (isCreate) {
    payload.visible = typeof body.visible === 'boolean' ? body.visible : true;
    payload.status = status;
  }
  return payload;
};

const buildCategoryUsagePath = (id: string) => buildDirectusPath('/items/articles', {
  fields: 'id',
  limit: 1,
  meta: 'filter_count',
  'filter[main_channel][_eq]': id,
});

const buildArticleCountPath = (scope: 'news' | 'notice', noticeChannelIds: string[]) => {
  const params: Record<string, string | number | boolean> = {
    fields: 'id',
    limit: 1,
    meta: 'filter_count',
  };
  if (scope === 'notice') {
    if (!noticeChannelIds.length) return '';
    params['filter[main_channel][_in]'] = noticeChannelIds.join(',');
  } else if (noticeChannelIds.length) {
    params['filter[main_channel][_nin]'] = noticeChannelIds.join(',');
  }
  return buildDirectusPath('/items/articles', params);
};

const buildCategoryCountPath = (scope: 'news' | 'notice') => {
  const params: Record<string, string | number | boolean> = {
    fields: 'id',
    limit: 1,
    meta: 'filter_count',
  };
  if (scope === 'notice') {
    params['filter[_or][0][type][_eq]'] = 'notice';
    params['filter[_or][1][path][_starts_with]'] = '/disclosure';
  } else {
    params['filter[_or][0][is_news_category][_eq]'] = true;
    params['filter[_or][1][type][_eq]'] = 'news';
  }
  return buildDirectusPath('/items/channels', params);
};

type PageModule = {
  id?: string;
  parent_title?: string;
  parent_code?: string;
  module_title?: string;
  module_code?: string;
  sort?: number | string;
};

const buildPageModulesPath = (request: NextRequest) => {
  const parentCode = (request.nextUrl.searchParams.get('parent_code') || '').trim();
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const devStatus = (request.nextUrl.searchParams.get('dev_status') || '').trim();
  const params: Record<string, string | number | boolean> = {
    fields: pageModuleFields,
    sort: 'parent_code,sort,module_title',
    limit: 500,
  };
  if (parentCode) params['filter[parent_code][_eq]'] = parentCode;
  if (devStatus && pageModuleDevStatuses.has(devStatus)) params['filter[dev_status][_eq]'] = devStatus;
  if (keyword) {
    params['filter[_or][0][module_title][_contains]'] = keyword;
    params['filter[_or][1][module_code][_contains]'] = keyword;
    params['filter[_or][2][parent_title][_contains]'] = keyword;
    params['filter[_or][3][placeholder_text][_contains]'] = keyword;
    params['filter[_or][4][remark][_contains]'] = keyword;
  }
  return buildDirectusPath('/items/page_modules', params);
};

const normalizePageModuleInput = (body: Record<string, unknown>) => {
  const payload: Record<string, unknown> = {};
  if (typeof body.placeholder_text === 'string') payload.placeholder_text = body.placeholder_text.trim();
  if (typeof body.remark === 'string') payload.remark = body.remark.trim();
  if (body.dev_status !== undefined) {
    if (typeof body.dev_status !== 'string' || !pageModuleDevStatuses.has(body.dev_status)) {
      throw Object.assign(new Error('invalid dev_status'), { status: 400 });
    }
    payload.dev_status = body.dev_status;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !pageModuleStatuses.has(body.status)) {
      throw Object.assign(new Error('invalid status'), { status: 400 });
    }
    payload.status = body.status;
  }
  if (body.sort !== undefined) {
    const sort = Number(body.sort);
    if (!Number.isFinite(sort)) throw Object.assign(new Error('sort must be a number'), { status: 400 });
    payload.sort = sort;
  }
  if (!Object.keys(payload).length) {
    throw Object.assign(new Error('no editable page module fields provided'), { status: 400 });
  }
  return payload;
};

const groupPageModules = (modules: PageModule[]) => {
  const groups: Array<{ parent_title: string; parent_code: string; modules: PageModule[] }> = [];
  const groupMap = new Map<string, { parent_title: string; parent_code: string; modules: PageModule[] }>();
  modules.forEach((module) => {
    const parentCode = module.parent_code || 'uncategorized';
    if (!groupMap.has(parentCode)) {
      const group = {
        parent_title: module.parent_title || '未分组',
        parent_code: parentCode,
        modules: [],
      };
      groupMap.set(parentCode, group);
      groups.push(group);
    }
    groupMap.get(parentCode)?.modules.push(module);
  });
  return groups;
};

const buildContentModulesPath = () => buildDirectusPath('/items/page_modules', {
  fields: pageModuleFields,
  sort: 'sort,module_title',
  limit: 500,
  'filter[status][_eq]': 'enabled',
});

const getContentModulePath = (moduleCode: string) => buildDirectusPath('/items/page_modules', {
  fields: pageModuleFields,
  limit: 1,
  'filter[module_code][_eq]': moduleCode,
  'filter[status][_eq]': 'enabled',
});

const buildContentModuleTree = (modules: PageModule[]) => {
  const groups: Array<{ parent_title: string; parent_code: string; sort: number; children: PageModule[] }> = [];
  const groupMap = new Map<string, { parent_title: string; parent_code: string; sort: number; children: PageModule[] }>();
  modules.forEach((module) => {
    const parentCode = module.parent_code || 'uncategorized';
    const moduleSort = Number.isFinite(Number(module.sort)) ? Number(module.sort) : 0;
    if (!groupMap.has(parentCode)) {
      const group = {
        parent_title: module.parent_title || '未分组',
        parent_code: parentCode,
        sort: moduleSort,
        children: [],
      };
      groupMap.set(parentCode, group);
      groups.push(group);
    }
    const group = groupMap.get(parentCode);
    if (!group) return;
    group.sort = Math.min(group.sort, moduleSort);
    group.children.push(module);
  });
  return groups.sort((a, b) => a.sort - b.sort).map((group) => ({
    parent_title: group.parent_title,
    parent_code: group.parent_code,
    children: group.children.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0)),
  }));
};

const emptyPageContent = (moduleCode: string) => ({
  module_code: moduleCode,
  title: '',
  subtitle: '',
  cover: null,
  summary: '',
  content: '',
  extra_json: {},
  status: 'draft',
});

const getPageContentPath = (moduleCode: string) => buildDirectusPath('/items/page_contents', {
  fields: 'id,module_code,title,subtitle,cover,summary,content,extra_json,status',
  limit: 1,
  'filter[module_code][_eq]': moduleCode,
});

const normalizeExtraJson = (value: unknown) => {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      throw Object.assign(new Error('extra_json must be valid JSON object'), { status: 400 });
    }
  }
  throw Object.assign(new Error('extra_json must be a JSON object'), { status: 400 });
};

const normalizePageContentInput = (body: Record<string, unknown>, moduleCode: string) => {
  const status = typeof body.status === 'string' && pageContentStatuses.has(body.status) ? body.status : 'draft';
  return {
    module_code: moduleCode,
    title: typeof body.title === 'string' ? body.title.trim() : '',
    subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : '',
    cover: body.cover || null,
    summary: typeof body.summary === 'string' ? body.summary.trim() : '',
    content: typeof body.content === 'string' ? body.content : '',
    extra_json: normalizeExtraJson(body.extra_json),
    status,
  };
};

const buildPageContentItemsPath = (request: NextRequest) => {
  const moduleCode = (request.nextUrl.searchParams.get('module_code') || '').trim();
  const itemType = (request.nextUrl.searchParams.get('item_type') || '').trim();
  const params: Record<string, string | number | boolean> = {
    fields: 'id,module_code,item_type,title,subtitle,date_label,image,content,link_url,sort,status,extra_json',
    sort: 'sort,id',
    limit: 500,
  };
  if (moduleCode) params['filter[module_code][_eq]'] = moduleCode;
  if (itemType && pageContentItemTypes.has(itemType)) params['filter[item_type][_eq]'] = itemType;
  return buildDirectusPath('/items/page_content_items', params);
};

const normalizePageContentItemInput = (body: Record<string, unknown>, isCreate = false) => {
  const moduleCode = typeof body.module_code === 'string' ? body.module_code.trim() : '';
  if (isCreate && !moduleCode) throw Object.assign(new Error('module_code is required'), { status: 400 });
  const itemType = typeof body.item_type === 'string' && pageContentItemTypes.has(body.item_type) ? body.item_type : 'timeline';
  const status = typeof body.status === 'string' && pageContentItemStatuses.has(body.status) ? body.status : 'enabled';
  const sort = Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0;
  const payload: Record<string, unknown> = {
    item_type: itemType,
    title: typeof body.title === 'string' ? body.title.trim() : '',
    subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : '',
    date_label: typeof body.date_label === 'string' ? body.date_label.trim() : '',
    image: body.image || null,
    content: typeof body.content === 'string' ? body.content : '',
    link_url: typeof body.link_url === 'string' ? body.link_url.trim() : '',
    sort,
    status,
    extra_json: normalizeExtraJson(body.extra_json),
  };
  if (isCreate) payload.module_code = moduleCode;
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  return payload;
};

const getArticleDetailPath = (id: string) => buildDirectusPath(`/items/articles/${encodeURIComponent(id)}`, {
  fields: 'id,title,subtitle,summary,cover,main_channel.id,main_channel.name,main_channel.slug,status,publish_at,source,author,content,attachments,attachments.*,attachments.file,attachments.file.id,attachments.file.filename_download,attachments.directus_files_id,attachments.directus_files_id.id,attachments.directus_files_id.filename_download,attachments.file_id',
});

const normalizeAttachmentsInput = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const file = typeof item.file === 'string' ? item.file.trim() : '';
      const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `附件${index + 1}`;
      if (!file) return null;
      return { title, file };
    })
    .filter(Boolean);
};

const normalizeArticleInput = async (request: NextRequest) => {
  const body = await request.json() as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const mainChannel = typeof body.main_channel === 'string' ? body.main_channel.trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  const status = typeof body.status === 'string' && articleStatuses.has(body.status) ? body.status : 'draft';
  const publishAt = typeof body.publish_at === 'string' && body.publish_at.trim()
    ? body.publish_at.trim()
    : new Date().toISOString();

  if (!title) throw Object.assign(new Error('title is required'), { status: 400 });
  if (!mainChannel) throw Object.assign(new Error('main_channel is required'), { status: 400 });
  if (!content.trim()) throw Object.assign(new Error('content is required'), { status: 400 });

  return {
    title,
    subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : '',
    summary: typeof body.summary === 'string' ? body.summary.trim() : '',
    main_channel: mainChannel,
    status,
    source: typeof body.source === 'string' ? body.source.trim() : '',
    author: typeof body.author === 'string' ? body.author.trim() : '',
    publish_at: publishAt,
    content,
    cover: typeof body.cover === 'string' && body.cover.trim() ? body.cover.trim() : null,
    attachments: normalizeAttachmentsInput(body.attachments),
  };
};

const updateArticleStatus = (id: string, status: string, token: string) => directusJsonRequest(`/items/articles/${encodeURIComponent(id)}`, token, 'PATCH', {
  status,
  ...(status === 'published' ? { publish_at: new Date().toISOString() } : {}),
});

const handleLocalLogin = async (request: NextRequest) => {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON request body' } }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'email and password are required' } }, { status: 400 });
  }

  try {
    const loginResult = await directusRequest<{ data?: { access_token?: string; refresh_token?: string } }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const authData = loginResult.data;
    if (!authData?.access_token) {
      return NextResponse.json(
        { error: { code: 'DIRECTUS_LOGIN_ERROR', message: 'Directus login response did not include an access token' } },
        { status: 500 },
      );
    }

    const sessionId = crypto.randomBytes(32).toString('base64url');
    adminSessions.set(sessionId, {
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
      expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
      email,
    });
    return createSessionResponse({ ok: true }, 200, sessionId);
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) || 500 : 500;
    const message = err instanceof Error ? err.message : `Directus is unavailable at ${directusUrl}`;
    return NextResponse.json(
      { error: { code: status === 401 ? 'INVALID_CREDENTIALS' : 'DIRECTUS_UNAVAILABLE', message } },
      { status: status === 401 ? 401 : 500 },
    );
  }
};

const handleLocalLogout = (request: NextRequest) => {
  const sessionId = decodeSessionCookie(request.cookies.get(sessionCookieName)?.value);
  if (sessionId) adminSessions.delete(sessionId);
  return clearSessionResponse();
};

const handleLocalMe = async (request: NextRequest) => {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Admin login required' } },
      { status: 401 },
    );
  }

  try {
    const me = await getCurrentDirectusUser(session.accessToken, session.email);
    return NextResponse.json({ data: await decorateAdminUser(session.accessToken, me) });
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) || 500 : 500;
    if (status === 401) adminSessions.delete(session.sessionId);
    return NextResponse.json(
      { error: { code: status === 401 ? 'UNAUTHORIZED' : 'DIRECTUS_UNAVAILABLE', message: err instanceof Error ? err.message : 'Admin API service error' } },
      { status: status === 401 ? 401 : 500 },
    );
  }
};

const getLocalAuthHandler = async (request: NextRequest, context: RouteContext) => {
  const route = await getRoutePath(context);
  if (route === 'login' && request.method === 'POST') return await handleLocalLogin(request);
  if (route === 'logout' && request.method === 'POST') return handleLocalLogout(request);
  if (route === 'me' && request.method === 'GET') return await handleLocalMe(request);
  return null;
};

const handleLocalChannels = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);
  const result = await directusJsonRequest<{ data?: unknown[] }>(getChannelsPath(getAdminScope(request)), serviceToken);
  return NextResponse.json({ data: result.data || [] });
};

const handleLocalArticleList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);

  if (request.method === 'POST') {
    const payload = await normalizeArticleInput(request);
    const result = await directusJsonRequest<{ data?: unknown }>('/items/articles', serviceToken, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: 201 });
  }

  const scope = getAdminScope(request);
  const { page, limit } = normalizePagination(request.nextUrl.searchParams.get('page'), request.nextUrl.searchParams.get('limit'));
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const channel = (request.nextUrl.searchParams.get('channel') || '').trim();
  const status = (request.nextUrl.searchParams.get('status') || '').trim();
  const noticeChannels = await getNoticeChannels(serviceToken);
  const noticeChannelIds = noticeChannels.map((item) => String(item.id || '')).filter(Boolean);
  const params: Record<string, string | number | boolean> = {
    fields: 'id,title,subtitle,summary,cover,main_channel.id,main_channel.name,main_channel.slug,status,publish_at,source,author',
    sort: '-publish_at,-id',
    page,
    limit,
    meta: 'filter_count',
  };

  if (keyword) {
    params['filter[_or][0][title][_contains]'] = keyword;
    params['filter[_or][1][summary][_contains]'] = keyword;
    params['filter[_or][2][subtitle][_contains]'] = keyword;
  }
  if (status && articleStatuses.has(status)) params['filter[status][_eq]'] = status;

  if (scope === 'notice') {
    if (!noticeChannelIds.length) return NextResponse.json({ data: [], meta: { filter_count: 0 } });
    if (channel) {
      const found = noticeChannels.find((item) => String(item.slug || '') === channel);
      if (!found?.id) return NextResponse.json({ data: [], meta: { filter_count: 0 } });
      params['filter[main_channel][_eq]'] = String(found.id);
    } else {
      params['filter[main_channel][_in]'] = noticeChannelIds.join(',');
    }
  } else {
    if (noticeChannelIds.length) params['filter[main_channel][_nin]'] = noticeChannelIds.join(',');
    if (channel) params['filter[main_channel][slug][_eq]'] = channel;
  }

  const result = await directusJsonRequest<{ data?: unknown[]; meta?: unknown }>(buildDirectusPath('/items/articles', params), serviceToken);
  return NextResponse.json({ data: result.data || [], meta: result.meta || null });
};

const handleLocalArticleRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);

  if (!action && request.method === 'GET') {
    const result = await directusJsonRequest<{ data?: unknown }>(getArticleDetailPath(id), serviceToken);
    return NextResponse.json({ data: result.data || null });
  }

  if (action === 'preview-link' && request.method === 'GET') {
    const detail = await directusJsonRequest<{ data?: { main_channel?: { id?: string } | string | null } }>(getArticleDetailPath(id), serviceToken);
    const current = detail.data || null;
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Article not found' } },
        { status: 404 },
      );
    }
    const noticeChannels = await getNoticeChannels(serviceToken);
    const noticeChannelIds = new Set(noticeChannels.map((item) => String(item.id || '')).filter(Boolean));
    const rawChannel = current.main_channel;
    const mainChannelId = typeof rawChannel === 'object' && rawChannel ? String(rawChannel.id || '') : String(rawChannel || '');
    const scope = getAdminScope(request);
    const isNoticeArticle = mainChannelId ? noticeChannelIds.has(mainChannelId) : false;
    if ((scope === 'notice' && !isNoticeArticle) || (scope !== 'notice' && isNoticeArticle)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Article not found in current scope' } },
        { status: 404 },
      );
    }
    const url = createArticlePreviewPath(id, isNoticeArticle ? 'notice' : 'news');
    return NextResponse.json({ data: { url } });
  }

  if (!action && request.method === 'PATCH') {
    const payload = await normalizeArticleInput(request);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/articles/${encodeURIComponent(id)}`, serviceToken, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }

  if (!action && request.method === 'DELETE') {
    const detail = await directusJsonRequest<{ data?: { main_channel?: { id?: string } | string | null } }>(getArticleDetailPath(id), serviceToken);
    const current = detail.data || null;
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Article not found' } },
        { status: 404 },
      );
    }
    const noticeChannels = await getNoticeChannels(serviceToken);
    const noticeChannelIds = new Set(noticeChannels.map((item) => String(item.id || '')).filter(Boolean));
    const rawChannel = current.main_channel;
    const mainChannelId = typeof rawChannel === 'object' && rawChannel ? String(rawChannel.id || '') : String(rawChannel || '');
    const scope = getAdminScope(request);
    const isNoticeArticle = mainChannelId ? noticeChannelIds.has(mainChannelId) : false;
    if ((scope === 'notice' && !isNoticeArticle) || (scope !== 'notice' && isNoticeArticle)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Article not found in current scope' } },
        { status: 404 },
      );
    }
    await directusJsonRequest(`/items/articles/${encodeURIComponent(id)}`, serviceToken, 'DELETE');
    return NextResponse.json({ data: { id, deleted: true } });
  }

  if (action && request.method === 'PATCH') {
    const statusMap: Record<string, string> = { archive: 'archived', publish: 'published', draft: 'draft' };
    const nextStatus = statusMap[action];
    if (!nextStatus) return null;
    const result = await updateArticleStatus(id, nextStatus, serviceToken);
    return NextResponse.json({ data: (result as { data?: unknown })?.data || null });
  }

  return null;
};

const handleLocalFileUpload = async (request: NextRequest) => {
  if (request.method !== 'POST') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'file is required' } },
      { status: 400 },
    );
  }
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  const isImage = allowedImageTypes.has(file.type);
  const isDocument = allowedDocumentTypes.has(file.type) || (!!extension && allowedDocumentExtensions.has(extension));
  if (!isImage && !isDocument) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Only JPG, PNG, WEBP, PDF, Word, and Excel files are allowed' } },
      { status: 400 },
    );
  }
  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      { error: { code: 'UPLOAD_TOO_LARGE', message: 'File upload is too large. Maximum size is 50MB.' } },
      { status: 413 },
    );
  }

  const uploadResult = await directusFormRequest<{ data?: {
    id?: string;
    filename_download?: string;
    filename_disk?: string;
    type?: string;
    filesize?: number;
  } }>('/files', session.accessToken, formData);
  const fileData = uploadResult.data;
  if (!fileData?.id) {
    throw Object.assign(new Error('Directus upload response did not include a file id'), { status: 500 });
  }

  const encodedId = encodeURIComponent(fileData.id);
  return NextResponse.json({
    data: {
      id: fileData.id,
      filename: fileData.filename_download || fileData.filename_disk || file.name,
      type: fileData.type || file.type,
      filesize: fileData.filesize || file.size,
      preview_url: `/admin-api/assets/${encodedId}`,
      asset_url: `${directusUrl}/assets/${encodedId}`,
    },
  }, { status: 201 });
};

const handleLocalCategoryList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  if (request.method === 'GET') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown[] }>(buildCategoryListPath(request), serviceToken);
    return NextResponse.json({ data: result.data || [] });
  }
  if (request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeCategoryInput(body, true, getAdminScope(request));
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>('/items/channels', serviceToken, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: 201 });
  }
  return null;
};

const handleLocalCategoryRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (!action && request.method === 'GET') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>(getCategoryDetailPath(id), serviceToken);
    return NextResponse.json({ data: result.data || null });
  }

  if (!action && request.method === 'PATCH') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeCategoryInput(body, false, getAdminScope(request));
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/channels/${encodeURIComponent(id)}`, serviceToken, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }

  if (!action && request.method === 'DELETE') {
    const usage = await directusJsonRequest<{ meta?: { filter_count?: number } }>(buildCategoryUsagePath(id), session.accessToken);
    const count = Number(usage.meta?.filter_count || 0);
    if (count > 0) {
      return NextResponse.json(
        { error: { code: 'CATEGORY_IN_USE', message: `Cannot delete category that has ${count} articles` } },
        { status: 400 },
      );
    }
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    await directusJsonRequest(`/items/channels/${encodeURIComponent(id)}`, serviceToken, 'DELETE');
    return NextResponse.json({ data: { id, deleted: true } });
  }

  if ((action === 'enable' || action === 'disable') && request.method === 'PATCH') {
    const enabled = action === 'enable';
    const scope = getAdminScope(request);
    const payload = scope === 'notice'
      ? { status: enabled ? 'enabled' : 'disabled', visible: enabled }
      : { status: enabled ? 'enabled' : 'disabled', visible: enabled, is_news_category: true };
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/channels/${encodeURIComponent(id)}`, serviceToken, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }

  if (action === 'usage' && request.method === 'GET') {
    const usage = await directusJsonRequest<{ meta?: { filter_count?: number } }>(buildCategoryUsagePath(id), session.accessToken);
    return NextResponse.json({ data: { article_count: Number(usage.meta?.filter_count || 0) } });
  }

  return null;
};

const handleLocalPageModuleList = async (request: NextRequest, grouped = false) => {
  if (request.method !== 'GET') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const result = await directusJsonRequest<{ data?: PageModule[] }>(buildPageModulesPath(request), session.accessToken);
  const modules = result.data || [];
  return NextResponse.json({ data: grouped ? groupPageModules(modules) : modules });
};

const handleLocalPageModuleRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  if (!id || request.method !== 'PATCH') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const body = await request.json() as Record<string, unknown>;
  const payload = normalizePageModuleInput(body);
  const result = await directusJsonRequest<{ data?: unknown }>(`/items/page_modules/${encodeURIComponent(id)}`, session.accessToken, 'PATCH', payload);
  return NextResponse.json({ data: result.data || null });
};

const handleLocalContentModuleTree = async (request: NextRequest) => {
  if (request.method !== 'GET') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const result = await directusJsonRequest<{ data?: PageModule[] }>(buildContentModulesPath(), session.accessToken);
  return NextResponse.json({ data: buildContentModuleTree(result.data || []) });
};

const handleLocalDashboardStats = async (request: NextRequest) => {
  if (request.method !== 'GET') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);
  const noticeChannels = await getNoticeChannels(serviceToken);
  const noticeChannelIds = noticeChannels.map((item) => String(item.id || '')).filter(Boolean);
  const noticeArticlesPath = buildArticleCountPath('notice', noticeChannelIds);

  const [newsArticles, newsCategories, noticeArticles, noticeCategories] = await Promise.all([
    directusJsonRequest<CountResponse>(buildArticleCountPath('news', noticeChannelIds), serviceToken),
    directusJsonRequest<CountResponse>(buildCategoryCountPath('news'), serviceToken),
    noticeArticlesPath ? directusJsonRequest<CountResponse>(noticeArticlesPath, serviceToken) : Promise.resolve({ meta: { filter_count: 0 } }),
    directusJsonRequest<CountResponse>(buildCategoryCountPath('notice'), serviceToken),
  ]);

  return NextResponse.json({
    data: {
      news_articles: Number(newsArticles.meta?.filter_count || 0),
      news_categories: Number(newsCategories.meta?.filter_count || 0),
      notice_articles: Number(noticeArticles.meta?.filter_count || 0),
      notice_categories: Number(noticeCategories.meta?.filter_count || 0),
    },
  });
};

const handleLocalContentModuleRoute = async (request: NextRequest, path: string[]) => {
  const moduleCode = path[1] ? decodeURIComponent(path[1]) : '';
  if (!moduleCode || request.method !== 'GET') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const result = await directusJsonRequest<{ data?: PageModule[] }>(getContentModulePath(moduleCode), session.accessToken);
  const module = Array.isArray(result.data) ? result.data[0] : null;
  if (!module) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Content module not found' } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: module });
};

const handleLocalPageContentRoute = async (request: NextRequest, path: string[]) => {
  const moduleCode = path[1] ? decodeURIComponent(path[1]) : '';
  if (!moduleCode) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (request.method === 'GET') {
    const result = await directusJsonRequest<{ data?: unknown[] }>(getPageContentPath(moduleCode), session.accessToken);
    const content = Array.isArray(result.data) ? result.data[0] : null;
    return NextResponse.json({ data: content || emptyPageContent(moduleCode) });
  }

  if (request.method === 'PUT') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizePageContentInput(body, moduleCode);
    const existing = await directusJsonRequest<{ data?: Array<{ id?: string }> }>(getPageContentPath(moduleCode), session.accessToken);
    const found = Array.isArray(existing.data) ? existing.data[0] : null;
    const result = found?.id
      ? await directusJsonRequest<{ data?: unknown }>(`/items/page_contents/${encodeURIComponent(found.id)}`, session.accessToken, 'PATCH', payload)
      : await directusJsonRequest<{ data?: unknown }>('/items/page_contents', session.accessToken, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: found?.id ? 200 : 201 });
  }

  return null;
};

const handleLocalPageContentItemsList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (request.method === 'GET') {
    const result = await directusJsonRequest<{ data?: unknown[] }>(buildPageContentItemsPath(request), session.accessToken);
    return NextResponse.json({ data: result.data || [] });
  }

  if (request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizePageContentItemInput(body, true);
    const result = await directusJsonRequest<{ data?: unknown }>('/items/page_content_items', session.accessToken, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: 201 });
  }

  return null;
};

const handleLocalPageContentItemRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id || request.method !== 'PATCH') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (action === 'disable') {
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/page_content_items/${encodeURIComponent(id)}`, session.accessToken, 'PATCH', { status: 'disabled' });
    return NextResponse.json({ data: result.data || null });
  }

  if (!action) {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizePageContentItemInput(body, false);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/page_content_items/${encodeURIComponent(id)}`, session.accessToken, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }

  return null;
};

const handleLocalAsset = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  if (!id || request.method !== 'GET') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);
  const assetResponse = await fetch(`${directusUrl}/assets/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers: assetResponse.headers,
  });
};

const normalizeUserInput = async (request: NextRequest, isCreate = false) => {
  const body = await request.json() as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const status = typeof body.status === 'string' && directusUserStatuses.has(body.status) ? body.status : 'active';
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : null;
  const menuKeys = menuKeysWithDashboard(body.menu_keys);
  if (!email) throw Object.assign(new Error('email is required'), { status: 400 });
  if (isCreate && !password) throw Object.assign(new Error('password is required'), { status: 400 });
  if (password && password.length < 8) throw Object.assign(new Error('password must be at least 8 characters'), { status: 400 });
  const payload: Record<string, unknown> = {
    email,
    first_name: firstName,
    last_name: lastName,
    status,
    role,
  };
  if (password) payload.password = password;
  return { payload, menuKeys };
};

const upsertUserMenuPermissions = async (token: string, userId: string, menuKeys: AdminMenuKey[]) => {
  const safeKeys = menuKeysWithDashboard(menuKeys);
  const serviceToken = await getServiceDirectusToken(token);
  try {
    const existing = await findUserMenuPermission(serviceToken, userId);
    const body = { user: userId, menu_keys: safeKeys, status: 'enabled' };
    if (existing?.id !== undefined && existing?.id !== null) {
      const result = await directusJsonRequest<{ data?: unknown }>(
        `/items/admin_menu_permissions/${encodeURIComponent(String(existing.id))}`,
        serviceToken,
        'PATCH',
        body,
      );
      return result.data || null;
    }
    const result = await directusJsonRequest<{ data?: unknown }>('/items/admin_menu_permissions', serviceToken, 'POST', body);
    return result.data || null;
  } catch (error) {
    if (isAdminMenuPermissionCollectionError(error)) throw adminMenuPermissionSetupError();
    throw error;
  }
};

const handleLocalRoles = async (request: NextRequest) => {
  if (request.method !== 'GET') return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);
  const result = await directusJsonRequest<{ data?: unknown[] }>(
    buildDirectusPath('/roles', {
      fields: directusRoleFields,
      sort: 'name',
      limit: 100,
    }),
    serviceToken,
  );
  return NextResponse.json({ data: result.data || [] });
};

const findAdminUserByEmail = async (token: string, email: string) => {
  const result = await directusJsonRequest<{ data?: DirectusAdminUser[] }>(
    buildDirectusPath('/users', {
      fields: directusUserListFields,
      limit: 1,
      'filter[email][_eq]': email,
    }),
    token,
  );
  return Array.isArray(result.data) ? result.data[0] || null : null;
};

const listAdminUsers = async (token: string, request: NextRequest) => {
  const serviceToken = await getServiceDirectusToken(token);
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const params: Record<string, string | number | boolean> = {
    fields: directusUserListFields,
    sort: 'email',
    limit: 200,
  };
  if (keyword) {
    params['filter[_or][0][email][_contains]'] = keyword;
    params['filter[_or][1][first_name][_contains]'] = keyword;
    params['filter[_or][2][last_name][_contains]'] = keyword;
  }
  const result = await directusJsonRequest<{ data?: DirectusAdminUser[] }>(buildDirectusPath('/users', params), serviceToken);
  return Promise.all((result.data || []).map((user) => decorateAdminUser(serviceToken, user)));
};

const handleLocalUsers = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (!id && request.method === 'GET') {
    return NextResponse.json({ data: await listAdminUsers(session.accessToken, request) });
  }

  if (!id && request.method === 'POST') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const { payload, menuKeys } = await normalizeUserInput(request, true);
    try {
      const created = await directusJsonRequest<{ data?: DirectusAdminUser }>('/users', serviceToken, 'POST', payload);
      const userId = String(created.data?.id || '');
      if (userId) await upsertUserMenuPermissions(serviceToken, userId, menuKeys);
      return NextResponse.json({ data: await decorateAdminUser(serviceToken, created.data || null) }, { status: 201 });
    } catch (error) {
      if (!isDirectusUniqueEmailError(error)) throw error;
      const existing = await findAdminUserByEmail(serviceToken, String(payload.email || ''));
      if (!existing?.id) throw error;
      const updatePayload = { ...payload };
      delete updatePayload.password;
      const updated = await directusJsonRequest<{ data?: DirectusAdminUser }>(`/users/${encodeURIComponent(existing.id)}`, serviceToken, 'PATCH', updatePayload);
      await upsertUserMenuPermissions(serviceToken, existing.id, menuKeys);
      return NextResponse.json({ data: await decorateAdminUser(serviceToken, updated.data || existing) });
    }
  }

  if (id && request.method === 'PATCH') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const current = await getCurrentDirectusUser(session.accessToken, session.email);
    const { payload, menuKeys } = await normalizeUserInput(request, false);
    if (current?.id === id && payload.status && payload.status !== 'active') {
      throw Object.assign(new Error('不能停用当前登录账号'), { status: 400 });
    }
    const updated = await directusJsonRequest<{ data?: DirectusAdminUser }>(`/users/${encodeURIComponent(id)}`, serviceToken, 'PATCH', payload);
    await upsertUserMenuPermissions(serviceToken, id, menuKeys);
    return NextResponse.json({ data: await decorateAdminUser(serviceToken, updated.data || null) });
  }

  if (id && request.method === 'DELETE') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const current = await getCurrentDirectusUser(session.accessToken, session.email);
    if (current?.id === id) {
      throw Object.assign(new Error('不能停用当前登录账号'), { status: 400 });
    }
    const updated = await directusJsonRequest<{ data?: DirectusAdminUser }>(`/users/${encodeURIComponent(id)}`, serviceToken, 'PATCH', { status: 'suspended' });
    return NextResponse.json({ data: await decorateAdminUser(serviceToken, updated.data || null) });
  }

  return null;
};

const handleLocalPermissions = async (request: NextRequest, path: string[]) => {
  const userId = path[1] ? decodeURIComponent(path[1]) : '';
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (!userId && request.method === 'GET') {
    return NextResponse.json({
      data: {
        menus: adminMenuItems,
        users: await listAdminUsers(session.accessToken, request),
      },
    });
  }

  if (userId && request.method === 'PUT') {
    const body = await request.json() as Record<string, unknown>;
    const menuKeys = menuKeysWithDashboard(body.menu_keys);
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    await upsertUserMenuPermissions(serviceToken, userId, menuKeys);
    const user = await directusJsonRequest<{ data?: DirectusAdminUser }>(buildDirectusPath(`/users/${encodeURIComponent(userId)}`, { fields: directusUserListFields }), serviceToken);
    return NextResponse.json({ data: await decorateAdminUser(serviceToken, user.data || null) });
  }

  return null;
};

const getLocalAdminHandler = async (request: NextRequest, context: RouteContext) => {
  const { path = [] } = await context.params;
  const route = path.join('/');
  try {
    const sessionState = requireSession(request);
    if (!sessionState.session) return sessionState.response;
    const accessError = await requireMenuAccess(request, route, sessionState.session);
    if (accessError) return accessError;
    if (path[0] === 'users') return await handleLocalUsers(request, path);
    if (route === 'roles') return await handleLocalRoles(request);
    if (path[0] === 'permissions') return await handleLocalPermissions(request, path);
    if (route === 'dashboard/stats') return await handleLocalDashboardStats(request);
    if (route === 'channels' && request.method === 'GET') return await handleLocalChannels(request);
    if (route === 'articles' && (request.method === 'GET' || request.method === 'POST')) return await handleLocalArticleList(request);
    if (path[0] === 'articles') return await handleLocalArticleRoute(request, path);
    if (route === 'files') return await handleLocalFileUpload(request);
    if (route === 'categories') return await handleLocalCategoryList(request);
    if (path[0] === 'categories') return await handleLocalCategoryRoute(request, path);
    if (route === 'page-modules') return await handleLocalPageModuleList(request);
    if (route === 'page-modules/grouped') return await handleLocalPageModuleList(request, true);
    if (path[0] === 'page-modules') return await handleLocalPageModuleRoute(request, path);
    if (route === 'content-modules/tree') return await handleLocalContentModuleTree(request);
    if (path[0] === 'content-modules') return await handleLocalContentModuleRoute(request, path);
    if (path[0] === 'page-contents') return await handleLocalPageContentRoute(request, path);
    if (route === 'page-content-items') return await handleLocalPageContentItemsList(request);
    if (path[0] === 'page-content-items') return await handleLocalPageContentItemRoute(request, path);
    if (path[0] === 'assets') return await handleLocalAsset(request, path);
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) || 500 : 500;
    return NextResponse.json(
      { error: { code: status === 400 ? 'BAD_REQUEST' : 'ADMIN_API_ERROR', message: err instanceof Error ? err.message : 'Admin API service error' } },
      { status },
    );
  }
  return null;
};

const proxyAdminApi = async (request: NextRequest, context: RouteContext) => {
  const localAuthResponse = await getLocalAuthHandler(request, context);
  if (localAuthResponse) return localAuthResponse;
  const localAdminResponse = await getLocalAdminHandler(request, context);
  if (localAdminResponse) return localAdminResponse;

  const target = await buildTargetUrl(request, context);
  if (!target) {
    const route = await getRoutePath(context);
    return NextResponse.json(
      {
        error: {
          code: 'ADMIN_API_ROUTE_NOT_MIGRATED',
          message: `/admin-api/${route} is not handled by the Next.js admin API yet. Set ADMIN_API_BASE only if this route must use the legacy web/server.js proxy.`,
        },
      },
      { status: 501 },
    );
  }

  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  let response: Response;
  try {
    response = await fetch(target, {
      method,
      headers: copyRequestHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'ADMIN_API_UNAVAILABLE',
          message: `Admin API proxy target is unavailable: ${getAdminApiBase()}. Check ADMIN_API_BASE, or unset it to use migrated Next.js handlers.`,
        },
      },
      { status: 502 },
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const GET = proxyAdminApi;
export const POST = proxyAdminApi;
export const PATCH = proxyAdminApi;
export const PUT = proxyAdminApi;
export const DELETE = proxyAdminApi;
