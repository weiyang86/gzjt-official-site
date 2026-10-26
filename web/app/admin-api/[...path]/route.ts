import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { allAdminMenuKeys, adminMenuItems, menuKeysWithDashboard, type AdminMenuKey } from '@/lib/admin/menu-permissions';
import { AdminSsoError, normalizeAdminTargetUrl, parseAdminSsoCredential } from '@/lib/admin/sso';
import { createArticlePreviewPath } from '@/lib/preview/article-preview';
import { contactInfoModuleCode, normalizeMapEmbedUrl } from '@/lib/cms/homepage-layout';
import { getPublicContactInfo } from '@/lib/cms/public-content';
import { request as apiStoreRequest, upload as apiStoreUpload, asset as apiStoreAsset, loginTrustedUser } from '@/lib/cms/api-store';
import { normalizeReportConfig, reportConfigModuleCode } from '@/lib/report/config';

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
const businessSectorStatuses = new Set(['enabled', 'disabled']);
const businessSectorFields = 'id,name,slug,cover,intro,sort,status';
const pageModuleDevStatuses = new Set(['developing', 'enabled', 'disabled']);
const pageModuleStatuses = new Set(['enabled', 'disabled']);
const pageContentStatuses = new Set(['draft', 'published', 'archived']);
const pageContentItemTypes = new Set(['timeline', 'leader', 'org_node', 'link', 'image', 'honor', 'article', 'attachment', 'download_category', 'download']);
const pageContentItemStatuses = new Set(['enabled', 'disabled']);
const downloadCenterModuleCode = 'download-center';
const downloadCategoryItemType = 'download_category';
const downloadResourceItemType = 'download';
const downloadItemFields = 'id,module_code,item_type,title,subtitle,content,link_url,sort,status,extra_json';
const downloadFileFields = 'id,filename_download,filename_disk,type,filesize';
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
const legacyNoticeChannelSlug = 'announcements';

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

const directusRequest = async <T>(pathname: string, init?: RequestInit): Promise<T> => apiStoreRequest(pathname, init) as Promise<T>;

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
  return fallbackToken || 'internal-api-service';
};

const directusFormRequest = async <T>(pathname: string, token: string, formData: FormData): Promise<T> => {
  if (pathname !== '/files') throw Object.assign(new Error('Unsupported file endpoint'), { status: 404 });
  const file = formData.get('file');
  if (!(file instanceof File)) throw Object.assign(new Error('file is required'), { status: 400 });
  return apiStoreUpload(file) as Promise<T>;
};

const normalizeUploadError = (error: unknown) => {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) || 500 : 500;
  const message = error instanceof Error ? error.message : String(error || '');
  if (
    message.includes('directus_files')
    || message.includes("don't have permission")
    || message.toLowerCase().includes('permission')
  ) {
    return Object.assign(new Error('文件上传失败：当前账号没有上传权限或文件库权限未配置，请联系管理员。'), { status });
  }
  return Object.assign(new Error(message || '文件上传失败，请稍后重试。'), { status });
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
  if (root === 'navigation') return ['navigation'];
  if (root === 'quick-links') return ['quickLinks'];
  if (root === 'contact-settings') return ['content', 'footerSettings'];
  if (root === 'friend-links' || root === 'site-settings' || root === 'footer-settings') return ['footerSettings'];
  if (root === 'report-settings') return ['report'];
  if (root === 'home-stats') return ['homeStats'];
  if (root === 'article-ownership') return ['articleOwnership'];
  if (root === 'files') return ['articleEdit', 'noticeEdit', 'content', 'downloads'];
  if (root === 'assets') return ['articles', 'articleEdit', 'noticeArticles', 'noticeEdit', 'content', 'downloads'];
  if (root === 'downloads' || root === 'download-categories') return ['downloads'];
  if (root === 'page-modules' || root === 'content-modules' || root === 'page-contents' || root === 'page-content-items' || root === 'business-sectors') return ['content'];
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
    params['filter[_or][2][slug][_eq]'] = legacyNoticeChannelSlug;
  } else {
    params['filter[is_news_category][_eq]'] = true;
    params['filter[slug][_neq]'] = legacyNoticeChannelSlug;
  }
  return buildDirectusPath('/items/channels', params);
};

const getNoticeChannels = async (token: string) => {
  const serviceToken = await getServiceDirectusToken(token);
  const result = await directusJsonRequest<{ data?: Array<{ id?: string; slug?: string; name?: string }> }>(getChannelsPath('notice'), serviceToken);
  return Array.isArray(result.data) ? result.data : [];
};

const getNewsChannels = async (token: string) => {
  const serviceToken = await getServiceDirectusToken(token);
  const result = await directusJsonRequest<{ data?: Array<{ id?: string; slug?: string; name?: string }> }>(getChannelsPath('news'), serviceToken);
  return Array.isArray(result.data) ? result.data : [];
};

const buildCategoryListPath = (request: NextRequest) => {
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const status = (request.nextUrl.searchParams.get('status') || '').trim();
  const scope = getAdminScope(request);
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '100', 10);
  const requestedPage = Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const params: Record<string, string | number | boolean> = {
    fields: 'id,name,slug,type,path,sort,visible,status,is_news_category,description,parent.id,parent.name',
    sort: 'sort,name',
    limit: Math.min(100, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 100)),
    page: Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
    meta: 'filter_count',
  };

  if (scope === 'notice') {
    params['filter[_and][0][_or][0][type][_eq]'] = 'notice';
    params['filter[_and][0][_or][1][path][_starts_with]'] = '/disclosure';
    params['filter[_and][0][_or][2][slug][_eq]'] = legacyNoticeChannelSlug;
  } else {
    params['filter[_and][0][_or][0][is_news_category][_eq]'] = true;
    params['filter[_and][0][_or][1][type][_eq]'] = 'news';
    params['filter[_and][1][slug][_neq]'] = legacyNoticeChannelSlug;
  }
  if (keyword) {
    const keywordIndex = scope === 'notice' ? 1 : 2;
    params[`filter[_and][${keywordIndex}][_or][0][name][_contains]`] = keyword;
    params[`filter[_and][${keywordIndex}][_or][1][slug][_contains]`] = keyword;
    params[`filter[_and][${keywordIndex}][_or][2][description][_contains]`] = keyword;
  }
  if (status && categoryStatuses.has(status)) {
    const statusIndex = scope === 'notice'
      ? (keyword ? 2 : 1)
      : (keyword ? 3 : 2);
    params[`filter[_and][${statusIndex}][status][_eq]`] = status;
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
  if (Object.hasOwn(body, 'parent')) payload.parent = body.parent ? String(body.parent) : null;
  if (isCreate) {
    payload.visible = typeof body.visible === 'boolean' ? body.visible : true;
    payload.status = status;
  }
  return payload;
};

const buildBusinessSectorListPath = (request: NextRequest) => {
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const status = (request.nextUrl.searchParams.get('status') || '').trim();
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '200', 10);
  const requestedPage = Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const params: Record<string, string | number | boolean> = {
    fields: businessSectorFields,
    sort: 'sort,id',
    limit: Math.min(200, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 200)),
    page: Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
    meta: 'filter_count',
  };
  if (keyword) {
    params['filter[_and][0][_or][0][name][_contains]'] = keyword;
    params['filter[_and][0][_or][1][slug][_contains]'] = keyword;
    params['filter[_and][0][_or][2][intro][_contains]'] = keyword;
  }
  if (status && businessSectorStatuses.has(status)) {
    params[`filter[_and][${keyword ? 1 : 0}][status][_eq]`] = status;
  }
  return buildDirectusPath('/items/business_sectors', params);
};

const getBusinessSectorDetailPath = (id: string) => buildDirectusPath(`/items/business_sectors/${encodeURIComponent(id)}`, {
  fields: businessSectorFields,
});

const normalizeBusinessSectorInput = (body: Record<string, unknown>) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!name) throw Object.assign(new Error('板块名称不能为空。'), { status: 400 });
  if (!slug) throw Object.assign(new Error('板块标识不能为空。'), { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw Object.assign(new Error('板块标识只能使用小写字母、数字和连字符。'), { status: 400 });
  }
  const status = typeof body.status === 'string' && businessSectorStatuses.has(body.status) ? body.status : 'enabled';
  return {
    name,
    slug,
    cover: typeof body.cover === 'string' ? body.cover.trim() : '',
    intro: typeof body.intro === 'string' ? body.intro : '',
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    status,
  };
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
    params['filter[_or][2][slug][_eq]'] = legacyNoticeChannelSlug;
  } else {
    params['filter[_or][0][is_news_category][_eq]'] = true;
    params['filter[_or][1][type][_eq]'] = 'news';
    params['filter[slug][_neq]'] = legacyNoticeChannelSlug;
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

const downloadText = (value: unknown) => typeof value === 'string' ? value : '';
const downloadExtra = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
};

const readDownloadRows = async (itemType: string, token: string) => {
  const result = await directusJsonRequest<{ data?: Array<Record<string, unknown>> }>(buildDirectusPath('/items/page_content_items', {
    fields: downloadItemFields,
    sort: 'sort,id',
    limit: -1,
    'filter[module_code][_eq]': downloadCenterModuleCode,
    'filter[item_type][_eq]': itemType,
  }), token);
  return Array.isArray(result.data) ? result.data : [];
};

const getDownloadRecord = async (id: string, itemType: string, token: string) => {
  const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(buildDirectusPath(`/items/page_content_items/${encodeURIComponent(id)}`, {
    fields: downloadItemFields,
  }), token);
  const item = result.data;
  if (!item || item.module_code !== downloadCenterModuleCode || item.item_type !== itemType) {
    throw Object.assign(new Error('资料下载记录不存在。'), { status: 404 });
  }
  return item;
};

const getDownloadFile = async (fileId: string, token: string) => {
  const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(buildDirectusPath(`/items/directus_files/${encodeURIComponent(fileId)}`, {
    fields: downloadFileFields,
  }), token);
  const file = result.data;
  if (!file?.id) throw Object.assign(new Error('附件不存在，请重新上传。'), { status: 400 });
  return {
    id: String(file.id),
    filename: downloadText(file.filename_download) || downloadText(file.filename_disk) || '附件',
    type: downloadText(file.type),
    filesize: Number(file.filesize) || 0,
  };
};

const mapDownloadCategory = (row: Record<string, unknown>) => ({
  id: String(row.id ?? ''),
  name: downloadText(row.title),
  slug: downloadText(row.subtitle),
  description: downloadText(row.content),
  sort: Number(row.sort) || 0,
  status: downloadText(row.status) || 'enabled',
});

const mapDownloadResource = (row: Record<string, unknown>) => {
  const extra = downloadExtra(row.extra_json);
  const fileId = downloadText(row.link_url);
  return {
    id: String(row.id ?? ''),
    name: downloadText(row.title),
    description: downloadText(row.content),
    categorySlug: downloadText(row.subtitle),
    fileId,
    fileUrl: fileId ? `/api/public/cms/assets/${encodeURIComponent(fileId)}` : '',
    filename: downloadText(extra.filename) || downloadText(row.title) || '附件',
    filesize: Number(extra.filesize) || 0,
    fileType: downloadText(extra.fileType) || downloadText(extra.file_type),
    sort: Number(row.sort) || 0,
    status: downloadText(row.status) || 'enabled',
  };
};

const normalizeDownloadCategoryInput = (body: Record<string, unknown>) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!name) throw Object.assign(new Error('资料分类名称不能为空。'), { status: 400 });
  if (!slug) throw Object.assign(new Error('资料分类标识不能为空。'), { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw Object.assign(new Error('资料分类标识只能使用小写字母、数字和连字符。'), { status: 400 });
  }
  return {
    module_code: downloadCenterModuleCode,
    item_type: downloadCategoryItemType,
    title: name,
    subtitle: slug,
    content: typeof body.description === 'string' ? body.description.trim() : '',
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    status: typeof body.status === 'string' && pageContentItemStatuses.has(body.status) ? body.status : 'enabled',
  };
};

const normalizeDownloadResourceInput = async (body: Record<string, unknown>, token: string, existing?: Record<string, unknown>) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const categorySlug = typeof body.category_slug === 'string'
    ? body.category_slug.trim()
    : typeof body.categorySlug === 'string'
      ? body.categorySlug.trim()
      : '';
  if (!name) throw Object.assign(new Error('资料名称不能为空。'), { status: 400 });
  if (!categorySlug) throw Object.assign(new Error('请选择资料分类。'), { status: 400 });

  const rawFileId = typeof body.file_id === 'string'
    ? body.file_id.trim()
    : typeof body.fileId === 'string'
      ? body.fileId.trim()
      : '';
  const fileId = rawFileId || downloadText(existing?.link_url);
  if (!fileId) throw Object.assign(new Error('请上传资料附件。'), { status: 400 });
  const file = await getDownloadFile(fileId, token);
  const previousExtra = downloadExtra(existing?.extra_json);

  return {
    module_code: downloadCenterModuleCode,
    item_type: downloadResourceItemType,
    title: name,
    subtitle: categorySlug,
    content: typeof body.description === 'string' ? body.description.trim() : '',
    link_url: fileId,
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    status: typeof body.status === 'string' && pageContentItemStatuses.has(body.status) ? body.status : 'enabled',
    extra_json: {
      ...previousExtra,
      filename: file.filename,
      filesize: file.filesize,
      fileType: file.type,
    },
  };
};

const assertDownloadCategoryExists = async (slug: string, token: string) => {
  const categories = await readDownloadRows(downloadCategoryItemType, token);
  const found = categories.find((row) => downloadText(row.subtitle) === slug);
  if (!found) throw Object.assign(new Error('所选资料分类不存在，请刷新后重试。'), { status: 400 });
  return found;
};

const getArticleDetailPath = (id: string) => buildDirectusPath(`/items/articles/${encodeURIComponent(id)}`, {
  fields: 'id,title,subtitle,summary,cover,main_channel,status,publish_at,source,author,content,attachments,attachments.*,attachments.file,attachments.file.id,attachments.file.filename_download,attachments.directus_files_id,attachments.directus_files_id.id,attachments.directus_files_id.filename_download,attachments.file_id',
});

const scopedArticleNotFoundMessage = (scope: 'news' | 'notice') => (
  scope === 'notice' ? '未找到该公告或当前账号无权限查看。' : '未找到该新闻或当前账号无权限查看。'
);

type ArticleChannel = { id?: string | number; name?: string; slug?: string; type?: string; path?: string };
type ArticleChannelValue = string | number | ArticleChannel | Array<string | number | ArticleChannel> | null | undefined;

const getArticleChannelValues = (channel: ArticleChannelValue): Array<string | number | ArticleChannel> => {
  if (!channel) return [];
  if (Array.isArray(channel)) return channel;
  if (typeof channel === 'string' && channel.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(channel);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [channel];
    }
  }
  return [channel];
};

const getArticleChannelIds = (channel: ArticleChannelValue) => getArticleChannelValues(channel)
  .map((item) => (typeof item === 'object' ? item.id : item))
  .filter((item): item is string | number => item !== undefined && item !== null && item !== '')
  .map(String);

const normalizeArticleChannelOutput = (article: Record<string, unknown>) => {
  const channels = getArticleChannelValues(article.main_channel as ArticleChannelValue)
    .filter((item): item is ArticleChannel => typeof item === 'object' && item !== null);
  return {
    ...article,
    main_channel: channels[0] || null,
    main_channels: channels,
  };
};

const getChannelDetail = async (id: string, token: string) => {
  try {
    const result = await directusJsonRequest<{ data?: { id?: string | number; name?: string; slug?: string; type?: string; path?: string } }>(
      buildDirectusPath(`/items/channels/${encodeURIComponent(id)}`, {
        fields: 'id,name,slug,type,path,status,is_news_category',
      }),
      token,
    );
    return result.data || null;
  } catch {
    return null;
  }
};

const getScopedArticleDetail = async (id: string, scope: 'news' | 'notice', token: string) => {
  const detail = await directusJsonRequest<{ data?: { main_channel?: ArticleChannelValue } & Record<string, unknown> }>(
    getArticleDetailPath(id),
    token,
  );
  let current = detail.data || null;
  if (!current) {
    throw Object.assign(new Error(scopedArticleNotFoundMessage(scope)), { status: 404 });
  }

  const noticeChannels = await getNoticeChannels(token);
  const noticeChannelIds = new Set(noticeChannels.map((item) => String(item.id || '')).filter(Boolean));
  const mainChannelIds = getArticleChannelIds(current.main_channel);
  const isNoticeArticle = mainChannelIds.some((channelId) => noticeChannelIds.has(channelId));
  if ((scope === 'notice' && !isNoticeArticle) || (scope !== 'notice' && isNoticeArticle)) {
    throw Object.assign(new Error(scopedArticleNotFoundMessage(scope)), { status: 404 });
  }

  const channelDetails = (await Promise.all(mainChannelIds.map((channelId) => getChannelDetail(channelId, token))))
    .filter((channel): channel is ArticleChannel => Boolean(channel))
    .map((channel, index) => ({ ...channel, id: String(channel.id || mainChannelIds[index]) }));
  current = normalizeArticleChannelOutput({ ...current, main_channel: channelDetails });

  return { article: current, isNoticeArticle };
};

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
  const mainChannels = getArticleChannelIds(body.main_channels as ArticleChannelValue || body.main_channel as ArticleChannelValue);
  const content = typeof body.content === 'string' ? body.content : '';
  const status = typeof body.status === 'string' && articleStatuses.has(body.status) ? body.status : 'draft';
  const publishAt = typeof body.publish_at === 'string' && body.publish_at.trim()
    ? body.publish_at.trim()
    : new Date().toISOString();

  if (!title) throw Object.assign(new Error('title is required'), { status: 400 });
  if (!mainChannels.length) throw Object.assign(new Error('main_channel is required'), { status: 400 });
  if (!content.trim()) throw Object.assign(new Error('content is required'), { status: 400 });

  return {
    title,
    subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : '',
    summary: typeof body.summary === 'string' ? body.summary.trim() : '',
    main_channel: mainChannels.length === 1 ? mainChannels[0] : mainChannels,
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

const handleLocalSsoLogin = async (request: NextRequest) => {
  let body: { key?: string; targetUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON request body' } }, { status: 400 });
  }

  const encryptedKey = typeof body.key === 'string' ? body.key : '';
  const ssoSecret = getEnvValue('ADMIN_SSO_SECRET');
  if (!ssoSecret) {
    return NextResponse.json(
      { error: { code: 'SSO_NOT_CONFIGURED', message: '单点登录服务尚未配置' } },
      { status: 503 },
    );
  }

  try {
    const { username } = parseAdminSsoCredential(encryptedKey, ssoSecret);
    const loginResult = await loginTrustedUser(username) as { data?: { access_token?: string; refresh_token?: string } };
    const authData = loginResult.data;
    if (!authData?.access_token) throw new AdminSsoError('单点登录失败', 'SSO_LOGIN_ERROR', 500);

    const sessionId = crypto.randomBytes(32).toString('base64url');
    adminSessions.set(sessionId, {
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
      expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
      email: username,
    });
    return createSessionResponse({ ok: true, data: { targetUrl: normalizeAdminTargetUrl(body.targetUrl) } }, 200, sessionId);
  } catch (error) {
    const status = error instanceof AdminSsoError
      ? error.status
      : (typeof error === 'object' && error && 'status' in error ? Number(error.status) || 500 : 500);
    const code = error instanceof AdminSsoError ? error.code : (status === 401 ? 'SSO_USER_UNAVAILABLE' : 'SSO_LOGIN_ERROR');
    return NextResponse.json(
      { error: { code, message: error instanceof Error ? error.message : '单点登录失败' } },
      { status },
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
  if (route === 'sso-login' && request.method === 'POST') return await handleLocalSsoLogin(request);
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

const handleLocalNavigation = async (request: NextRequest, path: string[]) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken);
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const fields = 'id,name,slug,parent.id,parent.name,type,path,sort,visible,status,is_news_category,description';
  if (!id && request.method === 'GET') {
    const result = await directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/channels', { fields, sort: 'sort,id', limit: -1 }), token);
    return NextResponse.json({ data: result.data || [] });
  }
  if (!id && request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeNavigationInput(body, true);
    const result = await directusJsonRequest<{ data?: unknown }>('/items/channels', token, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: 201 });
  }
  if (id && request.method === 'PATCH') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeNavigationInput(body, false);
    const all = await directusJsonRequest<{ data?: Array<Record<string, unknown>> }>(buildDirectusPath('/items/channels', { fields: 'id,parent.id', limit: -1 }), token);
    const parents = new Map((all.data || []).map((row) => [String(row.id), row.parent && typeof row.parent === 'object' ? String((row.parent as Record<string, unknown>).id || '') : '']));
    let ancestor = typeof body.parent === 'string' ? body.parent : '';
    const visited = new Set<string>();
    while (ancestor && !visited.has(ancestor)) {
      if (ancestor === id) throw Object.assign(new Error('不能将栏目移动到自身或自身的下级栏目中'), { status: 400 });
      visited.add(ancestor);
      ancestor = parents.get(ancestor) || '';
    }
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/channels/${encodeURIComponent(id)}`, token, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }
  if (id && request.method === 'DELETE') {
    const children = await directusJsonRequest<{ meta?: { filter_count?: number } }>(buildDirectusPath('/items/channels', { fields: 'id', limit: 1, 'filter[parent][_eq]': id }), token);
    const articles = await directusJsonRequest<{ meta?: { filter_count?: number } }>(buildDirectusPath('/items/articles', { fields: 'id', limit: 1, 'filter[main_channel][_eq]': id }), token);
    if (Number(children.meta?.filter_count || 0) || Number(articles.meta?.filter_count || 0)) {
      return NextResponse.json({ error: { code: 'NAVIGATION_IN_USE', message: '该栏目仍有子栏目或文章关联，请先停用，不要删除。' } }, { status: 409 });
    }
    await directusJsonRequest(`/items/channels/${encodeURIComponent(id)}`, token, 'DELETE');
    return NextResponse.json({ data: { id, deleted: true } });
  }
  return null;
};

const normalizeQuickLinkInput = (body: Record<string, unknown>) => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!title) throw Object.assign(new Error('请填写入口名称'), { status: 400 });
  if (!url || !/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) throw Object.assign(new Error('跳转地址必须是站内路径、http(s)、mailto、tel 或锚点地址'), { status: 400 });
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  return {
    title,
    slug,
    url,
    position: typeof body.position === 'string' && body.position.trim() ? body.position.trim() : 'home',
    summary: typeof body.summary === 'string' ? body.summary.trim() : '',
    icon: typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : null,
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    status: body.status === 'disabled' ? 'disabled' : 'enabled',
  };
};

const handleLocalQuickLinks = async (request: NextRequest, path: string[]) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken);
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const fields = 'id,title,slug,url,position,summary,icon,sort,status';
  if (!id && request.method === 'GET') {
    const position = request.nextUrl.searchParams.get('position') || '';
    const params: Record<string, string | number> = { fields, sort: 'sort,id', limit: -1 };
    if (position) params['filter[position][_eq]'] = position;
    const result = await directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/quick_links', params), token);
    return NextResponse.json({ data: result.data || [] });
  }
  if (!id && request.method === 'POST') {
    const payload = normalizeQuickLinkInput(await request.json() as Record<string, unknown>);
    const result = await directusJsonRequest<{ data?: unknown }>('/items/quick_links', token, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: 201 });
  }
  if (id && request.method === 'PATCH') {
    const payload = normalizeQuickLinkInput(await request.json() as Record<string, unknown>);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/quick_links/${encodeURIComponent(id)}`, token, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }
  if (id && request.method === 'DELETE') {
    await directusJsonRequest(`/items/quick_links/${encodeURIComponent(id)}`, token, 'DELETE');
    return NextResponse.json({ data: { id, deleted: true } });
  }
  return null;
};


const normalizeFriendLinkInput = (body: Record<string, unknown>) => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!title || title.length > 100) throw Object.assign(new Error('请填写友情链接名称且不能超过 100 个字符'), { status: 400 });
  if (!url || !/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) throw Object.assign(new Error('链接地址格式不正确'), { status: 400 });
  return { title, url, position: 'footer', sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0, status: body.status === 'disabled' ? 'disabled' : 'enabled' };
};

const handleLocalFriendLinks = async (request: NextRequest, path: string[]) => {
  const { session, response } = requireSession(request); if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken); const id = path[1] ? decodeURIComponent(path[1]) : '';
  if (!id && request.method === 'GET') { const result = await directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/friend_links', { fields: 'id,title,url,position,sort,status', sort: 'sort,id', limit: -1 }), token); return NextResponse.json({ data: result.data || [] }); }
  if (!id && request.method === 'POST') { const result = await directusJsonRequest<{ data?: unknown }>('/items/friend_links', token, 'POST', normalizeFriendLinkInput(await request.json() as Record<string, unknown>)); return NextResponse.json({ data: result.data || null }, { status: 201 }); }
  if (id && request.method === 'PATCH') { const result = await directusJsonRequest<{ data?: unknown }>(`/items/friend_links/${encodeURIComponent(id)}`, token, 'PATCH', normalizeFriendLinkInput(await request.json() as Record<string, unknown>)); return NextResponse.json({ data: result.data || null }); }
  if (id && request.method === 'DELETE') { await directusJsonRequest(`/items/friend_links/${encodeURIComponent(id)}`, token, 'DELETE'); return NextResponse.json({ data: { id, deleted: true } }); }
  return null;
};

const handleLocalSiteSettings = async (request: NextRequest) => {
  const { session, response } = requireSession(request); if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken);
  if (request.method === 'GET') { const result = await directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/site_settings', { fields: 'id,site_name,footer_text,address,phone,email,icp,copyright', limit: 1 }), token); return NextResponse.json({ data: result.data?.[0] || null }); }
  if (request.method === 'PATCH' || request.method === 'PUT') { const body = await request.json() as Record<string, unknown>; const payload = Object.fromEntries(['site_name','footer_text','address','phone','email','icp','copyright'].filter((key) => body[key] !== undefined).map((key) => [key, typeof body[key] === 'string' ? body[key].trim() : ''])); const current = await directusJsonRequest<{ data?: Array<{ id?: string }> }>(buildDirectusPath('/items/site_settings', { fields: 'id', limit: 1 }), token); const id = current.data?.[0]?.id; const result = id ? await directusJsonRequest<{ data?: unknown }>(`/items/site_settings/${encodeURIComponent(String(id))}`, token, 'PATCH', payload) : await directusJsonRequest<{ data?: unknown }>('/items/site_settings', token, 'POST', payload); return NextResponse.json({ data: result.data || null }); }
  return null;
};

type ContactSettingsInput = {
  email: string;
  phone: string;
  address: string;
  mapEmbedUrl: string;
};

const normalizeContactSettingsInput = (body: Record<string, unknown>): ContactSettingsInput => {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const rawMapEmbedUrl = typeof body.mapEmbedUrl === 'string' ? body.mapEmbedUrl.trim() : '';
  const mapEmbedUrl = normalizeMapEmbedUrl(rawMapEmbedUrl);
  if (email.length > 255) throw Object.assign(new Error('联系邮箱不能超过 255 个字符'), { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('联系邮箱格式不正确'), { status: 400 });
  if (phone.length > 255) throw Object.assign(new Error('联系电话不能超过 255 个字符'), { status: 400 });
  if (address.length > 255) throw Object.assign(new Error('联系地址不能超过 255 个字符'), { status: 400 });
  if (rawMapEmbedUrl.length > 2048) throw Object.assign(new Error('地图嵌入地址不能超过 2048 个字符'), { status: 400 });
  if (rawMapEmbedUrl && !mapEmbedUrl) throw Object.assign(new Error('地图嵌入地址必须是有效的 HTTP(S) 链接'), { status: 400 });
  return { email, phone, address, mapEmbedUrl };
};

const handleLocalContactSettings = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken);

  if (request.method === 'GET') {
    return NextResponse.json({ data: await getPublicContactInfo() });
  }

  if (request.method === 'PATCH' || request.method === 'PUT') {
    const input = normalizeContactSettingsInput(await request.json() as Record<string, unknown>);
    const settings = await directusJsonRequest<{ data?: Array<{ id?: string }> }>(
      buildDirectusPath('/items/site_settings', { fields: 'id', limit: 1 }),
      token,
    );
    const settingsId = settings.data?.[0]?.id;
    const contactFields = { email: input.email, phone: input.phone, address: input.address };
    if (settingsId) {
      await directusJsonRequest(`/items/site_settings/${encodeURIComponent(String(settingsId))}`, token, 'PATCH', contactFields);
    } else {
      await directusJsonRequest('/items/site_settings', token, 'POST', {
        site_name: '甘孜州建设投资集团有限公司',
        ...contactFields,
      });
    }

    const existing = await directusJsonRequest<{
      data?: Array<{
        id?: string;
        title?: string;
        subtitle?: string;
        cover?: unknown;
        summary?: string;
        content?: string;
        extra_json?: unknown;
      }>;
    }>(getPageContentPath(contactInfoModuleCode), token);
    const currentPage = existing.data?.[0];
    const currentExtra = normalizeExtraJson(currentPage?.extra_json) as Record<string, unknown>;
    const currentContactInfo = currentExtra.contactInfo && typeof currentExtra.contactInfo === 'object' && !Array.isArray(currentExtra.contactInfo)
      ? currentExtra.contactInfo as Record<string, unknown>
      : {};
    const pagePayload = {
      module_code: contactInfoModuleCode,
      title: currentPage?.title?.trim() || '联系我们配置',
      subtitle: currentPage?.subtitle?.trim() || '官网联系方式',
      cover: currentPage?.cover ?? null,
      summary: currentPage?.summary?.trim() || '维护官网联系邮箱、联系电话、联系地址和地图嵌入配置。',
      content: currentPage?.content || '',
      extra_json: { ...currentExtra, contactInfo: { ...currentContactInfo, ...input } },
      status: 'published',
    };
    if (currentPage?.id) {
      await directusJsonRequest(`/items/page_contents/${encodeURIComponent(String(currentPage.id))}`, token, 'PATCH', pagePayload);
    } else {
      await directusJsonRequest('/items/page_contents', token, 'POST', pagePayload);
    }

    return NextResponse.json({ data: input });
  }

  return null;
};
const normalizeHomeStatInput = (body: Record<string, unknown>) => {
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  if (!label || label.length > 64) throw Object.assign(new Error('指标名称不能为空且不能超过 64 个字符'), { status: 400 });
  if (!value || value.length > 64) throw Object.assign(new Error('指标数值不能为空且不能超过 64 个字符'), { status: 400 });
  if (unit.length > 16) throw Object.assign(new Error('单位不能超过 16 个字符'), { status: 400 });
  return {
    label,
    value,
    unit,
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    visible: body.visible !== false,
  };
};

const homeStatsModuleCode = 'homepage-business-metrics';

const toHomeStatPayload = (payload: ReturnType<typeof normalizeHomeStatInput>) => ({
  module_code: homeStatsModuleCode,
  item_type: 'link',
  title: payload.label,
  subtitle: payload.value,
  sort: payload.sort,
  status: payload.visible ? 'enabled' : 'disabled',
  extra_json: { unit: payload.unit },
});

const normalizeHomeStatOutput = (item: Record<string, unknown>) => {
  const extra = item.extra_json && typeof item.extra_json === 'object' && !Array.isArray(item.extra_json)
    ? item.extra_json as Record<string, unknown>
    : {};
  return {
    id: String(item.id || ''),
    label: typeof item.title === 'string' ? item.title : '',
    value: typeof item.subtitle === 'string' ? item.subtitle : '',
    unit: typeof extra.unit === 'string' ? extra.unit : '',
    sort: Number(item.sort) || 0,
    visible: item.status === 'enabled',
  };
};

const handleLocalHomeStats = async (request: NextRequest, path: string[]) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken);
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const fields = 'id,module_code,item_type,title,subtitle,sort,status,extra_json';
  if (!id && request.method === 'GET') {
    const result = await directusJsonRequest<{ data?: Array<Record<string, unknown>> }>(buildDirectusPath('/items/page_content_items', { fields, sort: 'sort,id', limit: -1, 'filter[module_code][_eq]': homeStatsModuleCode, 'filter[item_type][_eq]': 'link' }), token);
    return NextResponse.json({ data: (result.data || []).map(normalizeHomeStatOutput) });
  }
  if (!id && request.method === 'POST') {
    const payload = normalizeHomeStatInput(await request.json() as Record<string, unknown>);
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>('/items/page_content_items', token, 'POST', toHomeStatPayload(payload));
    return NextResponse.json({ data: result.data ? normalizeHomeStatOutput(result.data) : null }, { status: 201 });
  }
  if (id && request.method === 'PATCH') {
    const payload = normalizeHomeStatInput(await request.json() as Record<string, unknown>);
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(`/items/page_content_items/${encodeURIComponent(id)}`, token, 'PATCH', toHomeStatPayload(payload));
    return NextResponse.json({ data: result.data ? normalizeHomeStatOutput(result.data) : null });
  }
  if (id && request.method === 'DELETE') {
    await directusJsonRequest(`/items/page_content_items/${encodeURIComponent(id)}`, token, 'DELETE');
    return NextResponse.json({ data: { id, deleted: true } });
  }
  return null;
};

const normalizeNavigationInput = (body: Record<string, unknown>, isCreate: boolean) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!name || !slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw Object.assign(new Error('请填写名称及小写英文、数字或中横线组成的 slug'), { status: 400 });
  const type = typeof body.type === 'string' && categoryTypes.has(body.type) ? body.type : 'list';
  const status = body.status === 'disabled' ? 'disabled' : 'enabled';
  const payload: Record<string, unknown> = {
    name, slug, type,
    path: typeof body.path === 'string' && body.path.trim() ? body.path.trim() : `/${slug}`,
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    status,
    visible: typeof body.visible === 'boolean' ? body.visible : status === 'enabled',
    is_news_category: body.is_news_category === true,
    description: typeof body.description === 'string' ? body.description.trim() : '',
  };
  if (body.parent !== undefined) payload.parent = body.parent || null;
  else if (isCreate) payload.parent = null;
  return payload;
};

const handleLocalArticleOwnership = async (request: NextRequest, path: string[]) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = await getServiceDirectusToken(session.accessToken);
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  if (!id && request.method === 'GET') {
    const [articles, companies] = await Promise.all([
      directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/articles', { fields: 'id,title,status,publish_at,main_channel.id,main_channel.name,related_company.id,related_company.name', sort: '-publish_at,-id', limit: -1 }), token),
      directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/companies', { fields: 'id,name,slug', sort: 'sort,id', limit: -1 }), token),
    ]);
    return NextResponse.json({ data: { articles: articles.data || [], companies: companies.data || [] } });
  }
  if (id && request.method === 'PATCH') {
    const body = await request.json() as Record<string, unknown>;
    const company = typeof body.related_company === 'string' && body.related_company ? body.related_company : null;
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/articles/${encodeURIComponent(id)}`, token, 'PATCH', { related_company: company });
    return NextResponse.json({ data: result.data || null });
  }
  return null;
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
    if (channel) {
      // 本地数据 API 的 main_channel 可能是多选 JSON 数组，先用 slug 解析栏目 ID 再过滤。
      // 恢复单栏目关系字段后，仍可保留此查询方式，不影响兼容性。
      const newsChannels = await getNewsChannels(serviceToken);
      const found = newsChannels.find((item) => String(item.slug || '') === channel);
      if (!found?.id) return NextResponse.json({ data: [], meta: { filter_count: 0 } });
      params['filter[main_channel][_eq]'] = String(found.id);
    }
  }

  const result = await directusJsonRequest<{ data?: Array<Record<string, unknown>>; meta?: unknown }>(buildDirectusPath('/items/articles', params), serviceToken);
  return NextResponse.json({ data: (result.data || []).map(normalizeArticleChannelOutput), meta: result.meta || null });
};

const handleLocalArticleRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const serviceToken = await getServiceDirectusToken(session.accessToken);

  if (!action && request.method === 'GET') {
    const { article } = await getScopedArticleDetail(id, getAdminScope(request), serviceToken);
    return NextResponse.json({ data: article || null });
  }

  if (action === 'preview-link' && request.method === 'GET') {
    const { isNoticeArticle } = await getScopedArticleDetail(id, getAdminScope(request), serviceToken);
    const url = createArticlePreviewPath(id, isNoticeArticle ? 'notice' : 'news');
    return NextResponse.json({ data: { url } });
  }

  if (!action && request.method === 'PATCH') {
    const payload = await normalizeArticleInput(request);
    await getScopedArticleDetail(id, getAdminScope(request), serviceToken);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/articles/${encodeURIComponent(id)}`, serviceToken, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }

  if (!action && request.method === 'DELETE') {
    await getScopedArticleDetail(id, getAdminScope(request), serviceToken);
    await directusJsonRequest(`/items/articles/${encodeURIComponent(id)}`, serviceToken, 'DELETE');
    return NextResponse.json({ data: { id, deleted: true } });
  }

  if (action && request.method === 'PATCH') {
    const statusMap: Record<string, string> = { archive: 'archived', publish: 'published', draft: 'draft' };
    const nextStatus = statusMap[action];
    if (!nextStatus) return null;
    await getScopedArticleDetail(id, getAdminScope(request), serviceToken);
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

  let uploadResult: { data?: {
    id?: string;
    filename_download?: string;
    filename_disk?: string;
    type?: string;
    filesize?: number;
  } };
  try {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    uploadResult = await directusFormRequest('/files', serviceToken, formData);
  } catch (error) {
    throw normalizeUploadError(error);
  }
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
      asset_url: `/api/public/cms/assets/${encodedId}`,
    },
  }, { status: 201 });
};

const handleLocalCategoryList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  if (request.method === 'GET') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown[]; meta?: { filter_count?: number; total_count?: number } }>(buildCategoryListPath(request), serviceToken);
    return NextResponse.json({ data: result.data || [], meta: result.meta || {} });
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
    const parent = typeof body.parent === 'string' ? body.parent : '';
    if (parent) {
      const channels = await directusJsonRequest<{ data?: Array<{ id?: string; parent?: { id?: string } | string | null }> }>(
        buildDirectusPath('/items/channels', { fields: 'id,parent.id', limit: -1 }),
        session.accessToken,
      );
      const byId = new Map((channels.data || []).map((row) => [String(row.id || ''), typeof row.parent === 'string' ? row.parent : row.parent?.id || '']));
      let ancestor = parent;
      const visited = new Set<string>();
      while (ancestor && !visited.has(ancestor)) {
        if (ancestor === id) throw Object.assign(new Error('不能将分类移动到自身或自身的下级栏目中。'), { status: 400 });
        visited.add(ancestor);
        ancestor = byId.get(ancestor) || '';
      }
    }
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

const handleLocalBusinessSectorList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  if (request.method === 'GET') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown[]; meta?: { filter_count?: number; total_count?: number } }>(buildBusinessSectorListPath(request), serviceToken);
    return NextResponse.json({ data: result.data || [], meta: result.meta || {} });
  }
  if (request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeBusinessSectorInput(body);
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>('/items/business_sectors', serviceToken, 'POST', payload);
    return NextResponse.json({ data: result.data || null }, { status: 201 });
  }
  return null;
};

const handleLocalBusinessSectorRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (!action && request.method === 'GET') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>(getBusinessSectorDetailPath(id), serviceToken);
    return NextResponse.json({ data: result.data || null });
  }

  if (!action && request.method === 'PATCH') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeBusinessSectorInput(body);
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/business_sectors/${encodeURIComponent(id)}`, serviceToken, 'PATCH', payload);
    return NextResponse.json({ data: result.data || null });
  }

  if ((action === 'enable' || action === 'disable') && request.method === 'PATCH') {
    const serviceToken = await getServiceDirectusToken(session.accessToken);
    const result = await directusJsonRequest<{ data?: unknown }>(`/items/business_sectors/${encodeURIComponent(id)}`, serviceToken, 'PATCH', {
      status: action === 'enable' ? 'enabled' : 'disabled',
    });
    return NextResponse.json({ data: result.data || null });
  }

  return null;
};

const handleLocalDownloadCategoryList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = session.accessToken;

  if (request.method === 'GET') {
    const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim().toLowerCase();
    const status = (request.nextUrl.searchParams.get('status') || '').trim();
    const rows = await readDownloadRows(downloadCategoryItemType, token);
    const data = rows
      .map(mapDownloadCategory)
      .filter((item) => (!status || item.status === status)
        && (!keyword || `${item.name} ${item.slug} ${item.description}`.toLowerCase().includes(keyword)))
      .sort((left, right) => (left.sort - right.sort) || left.id.localeCompare(right.id));
    return NextResponse.json({ data });
  }

  if (request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeDownloadCategoryInput(body);
    const rows = await readDownloadRows(downloadCategoryItemType, token);
    if (rows.some((row) => downloadText(row.subtitle) === payload.subtitle)) {
      throw Object.assign(new Error('资料分类标识已存在，请更换后再保存。'), { status: 409 });
    }
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>('/items/page_content_items', token, 'POST', payload);
    return NextResponse.json({ data: mapDownloadCategory(result.data || payload) }, { status: 201 });
  }

  return null;
};

const handleLocalDownloadCategoryRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = session.accessToken;

  if (!action && request.method === 'GET') {
    const item = await getDownloadRecord(id, downloadCategoryItemType, token);
    return NextResponse.json({ data: mapDownloadCategory(item) });
  }

  if (!action && request.method === 'PATCH') {
    const existing = await getDownloadRecord(id, downloadCategoryItemType, token);
    const body = await request.json() as Record<string, unknown>;
    const payload = normalizeDownloadCategoryInput(body);
    const rows = await readDownloadRows(downloadCategoryItemType, token);
    if (rows.some((row) => row.id !== id && downloadText(row.subtitle) === payload.subtitle)) {
      throw Object.assign(new Error('资料分类标识已存在，请更换后再保存。'), { status: 409 });
    }
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(`/items/page_content_items/${encodeURIComponent(id)}`, token, 'PATCH', payload);

    const previousSlug = downloadText(existing.subtitle);
    if (previousSlug && previousSlug !== payload.subtitle) {
      const resources = await readDownloadRows(downloadResourceItemType, token);
      const affected = resources.filter((row) => downloadText(row.subtitle) === previousSlug);
      for (const row of affected) {
        await directusJsonRequest(`/items/page_content_items/${encodeURIComponent(String(row.id))}`, token, 'PATCH', {
          subtitle: payload.subtitle,
        });
      }
    }

    return NextResponse.json({ data: mapDownloadCategory(result.data || { ...existing, ...payload }) });
  }

  if ((action === 'enable' || action === 'disable') && request.method === 'PATCH') {
    await getDownloadRecord(id, downloadCategoryItemType, token);
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(`/items/page_content_items/${encodeURIComponent(id)}`, token, 'PATCH', {
      status: action === 'enable' ? 'enabled' : 'disabled',
    });
    return NextResponse.json({ data: mapDownloadCategory(result.data || { id }) });
  }

  return null;
};

const handleLocalDownloadList = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = session.accessToken;

  if (request.method === 'GET') {
    const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim().toLowerCase();
    const status = (request.nextUrl.searchParams.get('status') || '').trim();
    const categorySlug = (request.nextUrl.searchParams.get('category_slug') || '').trim();
    const rows = await readDownloadRows(downloadResourceItemType, token);
    const data = rows
      .map(mapDownloadResource)
      .filter((item) => (!status || item.status === status)
        && (!categorySlug || item.categorySlug === categorySlug)
        && (!keyword || `${item.name} ${item.description} ${item.filename} ${item.categorySlug}`.toLowerCase().includes(keyword)))
      .sort((left, right) => (left.sort - right.sort) || left.id.localeCompare(right.id));
    return NextResponse.json({ data });
  }

  if (request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>;
    const payload = await normalizeDownloadResourceInput(body, token);
    await assertDownloadCategoryExists(payload.subtitle, token);
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>('/items/page_content_items', token, 'POST', payload);
    return NextResponse.json({ data: mapDownloadResource(result.data || payload) }, { status: 201 });
  }

  return null;
};

const handleLocalDownloadRoute = async (request: NextRequest, path: string[]) => {
  const id = path[1] ? decodeURIComponent(path[1]) : '';
  const action = path[2] || '';
  if (!id) return null;
  const { session, response } = requireSession(request);
  if (!session) return response;
  const token = session.accessToken;

  if (!action && request.method === 'GET') {
    const item = await getDownloadRecord(id, downloadResourceItemType, token);
    return NextResponse.json({ data: mapDownloadResource(item) });
  }

  if (!action && request.method === 'PATCH') {
    const existing = await getDownloadRecord(id, downloadResourceItemType, token);
    const body = await request.json() as Record<string, unknown>;
    const payload = await normalizeDownloadResourceInput(body, token, existing);
    await assertDownloadCategoryExists(payload.subtitle, token);
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(`/items/page_content_items/${encodeURIComponent(id)}`, token, 'PATCH', payload);
    return NextResponse.json({ data: mapDownloadResource(result.data || { ...existing, ...payload }) });
  }

  if ((action === 'enable' || action === 'disable') && request.method === 'PATCH') {
    await getDownloadRecord(id, downloadResourceItemType, token);
    const result = await directusJsonRequest<{ data?: Record<string, unknown> }>(`/items/page_content_items/${encodeURIComponent(id)}`, token, 'PATCH', {
      status: action === 'enable' ? 'enabled' : 'disabled',
    });
    return NextResponse.json({ data: mapDownloadResource(result.data || { id }) });
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

const handleLocalReportSettings = async (request: NextRequest) => {
  const { session, response } = requireSession(request);
  if (!session) return response;

  if (request.method === 'GET') {
    const result = await directusJsonRequest<{ data?: unknown[] }>(buildDirectusPath('/items/page_contents', {
      fields: 'id,module_code,extra_json,status',
      limit: 1,
      'filter[module_code][_eq]': reportConfigModuleCode,
    }), session.accessToken);
    const item = Array.isArray(result.data) ? result.data[0] as Record<string, unknown> | undefined : undefined;
    let extra: unknown = item?.extra_json;
    if (typeof extra === 'string') {
      try {
        extra = JSON.parse(extra);
      } catch {
        extra = {};
      }
    }
    return NextResponse.json({
      data: {
        config: normalizeReportConfig(extra),
        status: typeof item?.status === 'string' ? item.status : 'draft',
        has_content: Boolean(item?.id),
      },
    });
  }

  if (request.method === 'PUT') {
    const body = await request.json() as Record<string, unknown>;
    let rawConfig: unknown = body.config ?? body.extra_json ?? body;
    if (typeof rawConfig === 'string') {
      try {
        rawConfig = JSON.parse(rawConfig);
      } catch {
        throw Object.assign(new Error('举报入口配置格式不正确'), { status: 400 });
      }
    }
    const config = normalizeReportConfig(rawConfig);
    const status = typeof body.status === 'string' && pageContentStatuses.has(body.status) ? body.status : 'published';
    const payload = {
      module_code: reportConfigModuleCode,
      title: '举报入口设置',
      subtitle: '',
      cover: null,
      summary: '',
      content: '',
      extra_json: { report: config },
      status,
    };
    const existing = await directusJsonRequest<{ data?: Array<{ id?: string }> }>(getPageContentPath(reportConfigModuleCode), session.accessToken);
    const found = Array.isArray(existing.data) ? existing.data[0] : null;
    await (found?.id
      ? directusJsonRequest<{ data?: unknown }>(`/items/page_contents/${encodeURIComponent(found.id)}`, session.accessToken, 'PATCH', payload)
      : directusJsonRequest<{ data?: unknown }>('/items/page_contents', session.accessToken, 'POST', payload));
    return NextResponse.json({ data: { config, status } }, { status: found?.id ? 200 : 201 });
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
  const assetResponse = await apiStoreAsset(id);
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
    if (path[0] === 'navigation') return await handleLocalNavigation(request, path);
    if (path[0] === 'quick-links') return await handleLocalQuickLinks(request, path);
    if (path[0] === 'home-stats') return await handleLocalHomeStats(request, path);
    if (path[0] === 'friend-links') return await handleLocalFriendLinks(request, path);
    if (path[0] === 'contact-settings') return await handleLocalContactSettings(request);
    if (path[0] === 'site-settings') return await handleLocalSiteSettings(request);
    if (path[0] === 'report-settings') return await handleLocalReportSettings(request);
    if (path[0] === 'article-ownership') return await handleLocalArticleOwnership(request, path);
    if (route === 'articles' && (request.method === 'GET' || request.method === 'POST')) return await handleLocalArticleList(request);
    if (path[0] === 'articles') return await handleLocalArticleRoute(request, path);
    if (route === 'files') return await handleLocalFileUpload(request);
    if (route === 'categories') return await handleLocalCategoryList(request);
    if (path[0] === 'categories') return await handleLocalCategoryRoute(request, path);
    if (route === 'business-sectors') return await handleLocalBusinessSectorList(request);
    if (path[0] === 'business-sectors') return await handleLocalBusinessSectorRoute(request, path);
    if (route === 'download-categories') return await handleLocalDownloadCategoryList(request);
    if (path[0] === 'download-categories') return await handleLocalDownloadCategoryRoute(request, path);
    if (route === 'downloads') return await handleLocalDownloadList(request);
    if (path[0] === 'downloads') return await handleLocalDownloadRoute(request, path);
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
