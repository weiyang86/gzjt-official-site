import fs from 'node:fs';
import path from 'node:path';
import { request as apiStoreRequest, asset as apiStoreAsset } from './api-store';

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

export class CmsRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CmsRequestError';
  }
}

const localAssetUrl = (assetId: string) => `/api/public/cms/assets/${encodeURIComponent(assetId)}`;

const legacyDirectusAssetId = (assetUrl: string) => {
  try {
    const url = new URL(assetUrl);
    const isLegacyHost = url.hostname === 'directus'
      || url.hostname === 'localhost'
      || url.hostname === 'gzjtjt.cn'
      || url.hostname.endsWith('.gzjtjt.cn');
    if (!isLegacyHost || !url.pathname.startsWith('/assets/')) return '';
    return url.pathname.replace(/^\/assets\//, '').split('/')[0] || '';
  } catch {
    return '';
  }
};

export const buildDirectusAssetUrl = (assetId?: string | null) => {
  const directusUrl = getDirectusUrl();
  if (!assetId || !directusUrl) return '';
  if (/^https?:\/\//i.test(assetId)) {
    const legacyId = legacyDirectusAssetId(assetId);
    return legacyId ? localAssetUrl(legacyId) : assetId;
  }
  if (assetId.startsWith('data:')) return assetId;
  if (assetId.startsWith('/assets/')) {
    const trimmed = assetId.replace(/^\/assets\//, '').split(/[?#]/)[0];
    return trimmed ? localAssetUrl(trimmed) : `${directusUrl}${assetId}`;
  }
  if (assetId.startsWith('/')) return assetId;
  return localAssetUrl(assetId);
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
      const legacyId = legacyDirectusAssetId(assetUrl);
      if (legacyId) return localAssetUrl(legacyId);
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

type NextRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export async function cmsFetch<T>(pathname: string, init?: NextRequestInit): Promise<T> {
  try {
    return await apiStoreRequest(pathname, init) as T;
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 502;
    throw new CmsRequestError(error instanceof Error ? error.message : 'Data API request failed', status || 502);
  }
}

export async function cmsPublicFetch<T>(pathname: string, init?: NextRequestInit): Promise<T> {
  return cmsFetch<T>(pathname, init);
}

export async function cmsPublicAssetFetch(assetId: string): Promise<Response> {
  try {
    return await apiStoreAsset(assetId);
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 502;
    throw new CmsRequestError(error instanceof Error ? error.message : 'Asset fetch failed', status || 502);
  }
}
