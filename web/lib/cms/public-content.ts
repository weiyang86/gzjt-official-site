import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import type { DirectusListResponse, PageModuleItem } from '@/types/cms';

const toText = (value: unknown) => typeof value === 'string' ? value : '';

export async function getPublicBanners(position?: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/banners', {
    fields: '*.*',
    sort: 'sort,-date_created',
    limit: 10,
    'filter[status][_eq]': 'published',
    ...(position ? { 'filter[position][_eq]': position } : {}),
  }));

  return (response.data || []).map((item) => ({
    id: String(item.id ?? ''),
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    image: buildDirectusAssetUrl(toText(item.image) || toText(item.image_url) || toText(item.cover)),
    linkUrl: toText(item.link_url) || toText(item.linkUrl) || toText(item.url),
  }));
}

export async function getPublicHomeSections() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/home_sections', {
    fields: '*.*',
    sort: 'sort,id',
    limit: -1,
    'filter[status][_eq]': 'enabled',
  }));

  return response.data || [];
}

export async function getPublicQuickLinks(position?: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/quick_links', {
    fields: '*.*',
    sort: 'sort,id',
    limit: -1,
    'filter[status][_eq]': 'enabled',
    ...(position ? { 'filter[position][_eq]': position } : {}),
  }));

  return (response.data || []).map((item) => ({
    id: String(item.id ?? ''),
    title: toText(item.title),
    url: toText(item.url) || toText(item.link_url),
    linkUrl: toText(item.link_url) || toText(item.url),
  }));
}

export async function getPublicSiteSettings() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/site_settings', {
    fields: '*.*',
    limit: 1,
  }));
  const item = response.data?.[0] || {};
  return {
    siteName: toText(item.site_name) || toText(item.siteName),
    footerText: toText(item.footer_text) || toText(item.footerText),
    logo: buildDirectusAssetUrl(toText(item.logo)),
  };
}

export async function getPublicPageModule(moduleCode: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
    'filter[module_code][_eq]': moduleCode,
    'filter[status][_eq]': 'published',
    limit: 1,
    fields: 'id,module_code,title,subtitle,cover,summary,content,status',
  }));
  const item = response.data?.[0];
  if (!item) return null;
  return {
    id: String(item.id ?? ''),
    moduleCode: toText(item.module_code),
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    summary: toText(item.summary),
    content: toText(item.content),
  };
}

export async function getPublicPageModuleItems(moduleCode: string, itemType: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    'filter[module_code][_eq]': moduleCode,
    'filter[item_type][_eq]': itemType,
    'filter[status][_eq]': 'enabled',
    sort: 'sort,id',
    limit: -1,
    fields: 'id,title,subtitle,content,image,sort,status',
  }));
  return (response.data || []).map((item): PageModuleItem => ({
    id: String(item.id ?? ''),
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    content: toText(item.content),
    image: buildDirectusAssetUrl(toText(item.image)),
    sort: Number(item.sort) || 0,
  })).filter((item) => item.title || item.subtitle || item.content || item.image);
}

export async function getPublicPlatformQrs() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,title,image,sort,status',
    sort: 'sort,id',
    limit: 50,
    'filter[module_code][_eq]': 'global-public-platform-qr',
    'filter[item_type][_eq]': 'image',
    'filter[status][_eq]': 'enabled',
  }));

  return (response.data || []).map((item) => ({
    id: String(item.id ?? ''),
    title: toText(item.title),
    image: buildDirectusAssetUrl(toText(item.image)),
    sort: Number(item.sort) || 0,
  })).filter((item) => item.image);
}
