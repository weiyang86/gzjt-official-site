import fs from 'node:fs';
import path from 'node:path';

const loadEnvFile = (absPath: string) => {
  if (!fs.existsSync(absPath)) return;
  const content = fs.readFileSync(absPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const index = raw.indexOf('=');
    if (index <= 0) return;
    const key = raw.slice(0, index).trim();
    let value = raw.slice(index + 1).trim();
    if (!key || process.env[key]) return;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
};

export const loadCmsEnv = () => {
  [
    path.join(process.cwd(), '.env.directus'),
    path.join(process.cwd(), '..', '.env.directus'),
  ].forEach(loadEnvFile);
};

const getDirectusUrl = () => {
  loadCmsEnv();
  return (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/+$/, '');
};

let publicDirectusAuthCache = { accessToken: '', expiresAt: 0 };

export class CmsRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CmsRequestError';
  }
}

export const buildDirectusAssetUrl = (assetId?: string | null) => {
  const directusUrl = getDirectusUrl();
  if (!assetId || !directusUrl) return '';
  if (/^https?:\/\//i.test(assetId) || assetId.startsWith('data:')) return assetId;
  if (assetId.startsWith('/assets/')) {
    const trimmed = assetId.replace(/^\/assets\//, '').split(/[?#]/)[0];
    return trimmed ? `/api/public/cms/assets/${encodeURIComponent(trimmed)}` : `${directusUrl}${assetId}`;
  }
  if (assetId.startsWith('/')) return assetId;
  return `/api/public/cms/assets/${encodeURIComponent(assetId)}`;
};

export const normalizePublicAssetUrl = (assetUrl?: string | null) => {
  const directusUrl = getDirectusUrl();
  if (!assetUrl) return '';
  if (assetUrl.startsWith('/api/public/cms/assets/')) return assetUrl;
  if (assetUrl.startsWith('/admin-api/assets/')) {
    const trimmed = assetUrl.replace(/^\/admin-api\/assets\//, '').split(/[?#]/)[0];
    return trimmed ? `/api/public/cms/assets/${encodeURIComponent(trimmed)}` : assetUrl;
  }
  if (assetUrl.startsWith('/assets/')) return buildDirectusAssetUrl(assetUrl);
  if (/^https?:\/\//i.test(assetUrl)) {
    try {
      const url = new URL(assetUrl);
      const directus = new URL(directusUrl);
      if (url.origin === directus.origin && url.pathname.startsWith('/assets/')) {
        return buildDirectusAssetUrl(`${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      return assetUrl;
    }
  }
  return assetUrl;
};

export const buildDirectusPath = (pathname: string, params: Record<string, string | number | boolean | undefined | null> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const normalizeDirectusError = async (response: Response) => {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {}
  const payload = body as { errors?: Array<{ message?: string }>; message?: string } | null;
  return payload?.errors?.[0]?.message || payload?.message || response.statusText || 'Directus request failed';
};

type NextRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export async function cmsFetch<T>(pathname: string, init?: NextRequestInit): Promise<T> {
  const directusUrl = getDirectusUrl();
  if (!directusUrl) {
    throw new CmsRequestError('DIRECTUS_URL or PUBLIC_URL is not configured.', 500);
  }

  const headers = new Headers(init?.headers);
  headers.set('Accept', headers.get('Accept') || 'application/json');
  const response = await fetch(`${directusUrl}${pathname}`, {
    ...init,
    headers,
    next: {
      revalidate: 300,
      ...init?.next,
    },
  });

  if (!response.ok) {
    throw new CmsRequestError(await normalizeDirectusError(response), response.status);
  }

  return response.json() as Promise<T>;
}

const getPublicDirectusHeaders = async (): Promise<Record<string, string>> => {
  loadCmsEnv();
  const serviceDirectusToken = process.env.DIRECTUS_TOKEN || '';
  const serviceDirectusEmail = process.env.DIRECTUS_EMAIL || process.env.ADMIN_EMAIL || '';
  const serviceDirectusPassword = process.env.DIRECTUS_PASSWORD || process.env.ADMIN_PASSWORD || '';

  if (serviceDirectusToken) return { Authorization: `Bearer ${serviceDirectusToken}` };
  if (publicDirectusAuthCache.accessToken && publicDirectusAuthCache.expiresAt > Date.now() + 30_000) {
    return { Authorization: `Bearer ${publicDirectusAuthCache.accessToken}` };
  }
  if (!serviceDirectusEmail || !serviceDirectusPassword) {
    return {};
  }

  const loginResult = await cmsFetch<{ data?: { access_token?: string; expires?: number } }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: serviceDirectusEmail, password: serviceDirectusPassword }),
    next: { revalidate: false },
  });
  const accessToken = loginResult?.data?.access_token || '';
  const expiresRaw = Number(loginResult?.data?.expires || 300);
  if (!accessToken) throw new CmsRequestError('Directus service login did not return an access token.', 500);
  const expiresMs = expiresRaw > 86_400 ? expiresRaw : expiresRaw * 1000;
  publicDirectusAuthCache = {
    accessToken,
    expiresAt: Date.now() + Math.max(60_000, expiresMs),
  };
  return { Authorization: `Bearer ${accessToken}` };
};

export async function cmsPublicFetch<T>(pathname: string, init?: NextRequestInit): Promise<T> {
  const headers = await getPublicDirectusHeaders();
  const mergedHeaders = new Headers(init?.headers);
  Object.entries(headers).forEach(([key, value]) => mergedHeaders.set(key, value));
  try {
    return await cmsFetch<T>(pathname, {
      ...init,
      headers: mergedHeaders,
    });
  } catch (error) {
    if (error instanceof CmsRequestError && error.status === 401 && !process.env.DIRECTUS_TOKEN) {
      publicDirectusAuthCache = { accessToken: '', expiresAt: 0 };
      const retryHeaders = await getPublicDirectusHeaders();
      const retryMergedHeaders = new Headers(init?.headers);
      Object.entries(retryHeaders).forEach(([key, value]) => retryMergedHeaders.set(key, value));
      return cmsFetch<T>(pathname, {
        ...init,
        headers: retryMergedHeaders,
      });
    }
    throw error;
  }
}

export async function cmsPublicAssetFetch(assetId: string): Promise<Response> {
  const directusUrl = getDirectusUrl();
  if (!directusUrl) {
    throw new CmsRequestError('DIRECTUS_URL or PUBLIC_URL is not configured.', 500);
  }
  const requestAsset = async () => {
    const headers = await getPublicDirectusHeaders();
    return fetch(`${directusUrl}/assets/${encodeURIComponent(assetId)}`, {
      headers,
      cache: 'no-store',
    });
  };
  let response = await requestAsset();
  if (response.status === 401 && !process.env.DIRECTUS_TOKEN) {
    publicDirectusAuthCache = { accessToken: '', expiresAt: 0 };
    response = await requestAsset();
  }
  if (!response.ok) {
    throw new CmsRequestError(await normalizeDirectusError(response), response.status);
  }
  return response;
}
