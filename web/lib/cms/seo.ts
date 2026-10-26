import type { Metadata } from 'next';
import { buildDirectusPath, cmsPublicFetch } from './client';
import {
  defaultSeoConfig,
  getSeoPageDefinition,
  getSiteBaseUrl,
  normalizeSeoConfig,
  seoConfigModuleCode,
  type SeoConfig,
} from '@/lib/seo/pages';
import type { DirectusListResponse } from '@/types/cms';

const realtimeCmsInit = { cache: 'no-store' as const, next: { revalidate: false as const } };

export async function getPublicSeoConfig(): Promise<SeoConfig> {
  try {
    const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
      fields: 'extra_json,status',
      limit: 1,
      'filter[module_code][_eq]': seoConfigModuleCode,
      'filter[status][_eq]': 'published',
    }), realtimeCmsInit);
    const rawValue = response.data?.[0]?.extra_json;
    const value = typeof rawValue === 'string' ? JSON.parse(rawValue) as unknown : rawValue;
    return normalizeSeoConfig(value);
  } catch {
    // 后台尚未发布 SEO 配置或数据接口暂不可用时，回退到内置默认值，不影响前台页面渲染。
    return defaultSeoConfig;
  }
}

export const toAbsoluteUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = getSiteBaseUrl();
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
};

export type SeoMetadataInput = {
  path: string;
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
};

export async function buildSeoMetadata(input: SeoMetadataInput): Promise<Metadata> {
  const config = await getPublicSeoConfig();
  const definition = getSeoPageDefinition(input.path);
  const pageConfig = config.pages[input.path] || null;

  const title = (input.title || pageConfig?.title || definition?.defaultTitle || config.defaultTitle).trim()
    || config.defaultTitle;
  const description = (input.description || pageConfig?.description || definition?.defaultDescription || config.defaultDescription).trim();
  const keywords = (input.keywords || pageConfig?.keywords || '').trim();
  const image = toAbsoluteUrl(input.image);
  const url = input.path === '/' ? getSiteBaseUrl() : toAbsoluteUrl(input.path);
  const absoluteTitle = title === config.siteName;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: config.siteName,
      locale: 'zh_CN',
      type: input.type || 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
