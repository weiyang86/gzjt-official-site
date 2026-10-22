import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import type { DirectusListResponse } from '@/types/cms';
import { contactInfoModuleCode, defaultContactInfo, defaultHomepageLayout, normalizeHomepageLayout, homepageLayoutModuleCode } from './homepage-layout';

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

export async function getPublicHomeStats() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,title,subtitle,sort,status,extra_json',
    sort: 'sort,id',
    limit: -1,
    'filter[module_code][_eq]': 'homepage-business-metrics',
    'filter[item_type][_eq]': 'link',
    'filter[status][_eq]': 'enabled',
  }));

  return (response.data || []).map((item) => {
    const extra = item.extra_json && typeof item.extra_json === 'object' && !Array.isArray(item.extra_json)
      ? item.extra_json as Record<string, unknown>
      : {};
    return {
    id: String(item.id ?? ''),
    label: toText(item.title),
    value: toText(item.subtitle),
    unit: toText(extra.unit),
    sort: Number(item.sort) || 0,
    };
  }).filter((item) => item.label && item.value);
}

export async function getPublicFriendLinks(position?: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/friend_links', { fields: 'id,title,url,position,sort,status', sort: 'sort,id', limit: -1, 'filter[status][_eq]': 'enabled', ...(position ? { 'filter[position][_eq]': position } : {}) }));
  return (response.data || []).map((item) => ({ id: String(item.id ?? ''), title: toText(item.title), url: toText(item.url), sort: Number(item.sort) || 0 })).filter((item) => item.title && item.url);
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
    address: toText(item.address),
    phone: toText(item.phone),
    email: toText(item.email),
    icp: toText(item.icp),
    copyright: toText(item.copyright),
  };
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

export async function getPublicHomepageLayout() {
  try {
    const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
      fields: 'module_code,extra_json,status',
      limit: 1,
      'filter[module_code][_eq]': homepageLayoutModuleCode,
      'filter[status][_eq]': 'published',
    }), { cache: 'no-store', next: { revalidate: false } });
    const rawValue = response.data?.[0]?.extra_json;
    const value = typeof rawValue === 'string' ? JSON.parse(rawValue) as unknown : rawValue;
    const config = value && typeof value === 'object' && 'homepageLayout' in value
      ? (value as Record<string, unknown>).homepageLayout
      : value;
    const normalized = normalizeHomepageLayout(config);
    const resolveImage = (image: string) => image ? buildDirectusAssetUrl(image) : '';
    return {
      ...normalized,
      backgrounds: Object.fromEntries(Object.entries(normalized.backgrounds).map(([key, image]) => [key, resolveImage(image)])) as typeof normalized.backgrounds,
      bannerSlides: normalized.bannerSlides.map((slide) => ({ ...slide, image: resolveImage(slide.image) })),
    };
  } catch {
    return defaultHomepageLayout;
  }
}

export async function getPublicContactInfo() {
  try {
    const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
      fields: 'extra_json,status',
      limit: 1,
      'filter[module_code][_eq]': contactInfoModuleCode,
      'filter[status][_eq]': 'published',
    }), { cache: 'no-store', next: { revalidate: false } });
    const rawExtra = response.data?.[0]?.extra_json;
    const extra = typeof rawExtra === 'string' ? JSON.parse(rawExtra) as unknown : rawExtra;
    const value = extra && typeof extra === 'object' && 'contactInfo' in extra
      ? (extra as Record<string, unknown>).contactInfo
      : null;
    if (value && typeof value === 'object') {
      const config = value as Partial<typeof defaultContactInfo>;
      return {
        email: typeof config.email === 'string' ? config.email : defaultContactInfo.email,
        phone: typeof config.phone === 'string' ? config.phone : defaultContactInfo.phone,
        address: typeof config.address === 'string' ? config.address : defaultContactInfo.address,
      };
    }
  } catch {
    // 新配置尚未发布或 API 暂不可用时，继续使用已有首页联系信息作为兼容回退。
  }

  const homepage = await getPublicHomepageLayout();
  return {
    email: defaultContactInfo.email,
    phone: homepage.contactPhone || defaultContactInfo.phone,
    address: homepage.contactAddress || defaultContactInfo.address,
  };
}
