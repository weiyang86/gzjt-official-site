import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import type { DirectusListResponse, HistoryTimelineItem, HonorItem, TrainingResource, TrainingResourceKind } from '@/types/cms';
import { contactInfoModuleCode, defaultContactInfo, defaultHomepageLayout, normalizeHomepageLayout, normalizeMapEmbedUrl, homepageLayoutModuleCode, type ContactInfoConfig } from './homepage-layout';

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

export async function getPublicPageModule(moduleCode: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
    'filter[module_code][_eq]': moduleCode,
    'filter[status][_eq]': 'published',
    limit: 1,
    fields: 'id,module_code,title,cover,content,status',
  }));
  const item = response.data?.[0];
  if (!item) return null;
  return {
    id: String(item.id ?? ''),
    moduleCode: toText(item.module_code),
    title: toText(item.title),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    content: toText(item.content),
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

export const historyTimelineModuleCode = 'group-history';
export const historyTimelineItemType = 'timeline';

const decodeBasicEntities = (value: string) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&#x27;/gi, "'")
  .replace(/&amp;/gi, '&');

/**
 * 时间轴“内容”字段允许后台粘贴富文本；前台按纯文本展示，保留换行但移除标签。
 */
const normalizeTimelineContent = (value: string) => {
  if (!value) return '';
  return decodeBasicEntities(value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export async function getPublicHistoryTimeline() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,module_code,item_type,date_label,title,content,sort,status',
    sort: 'sort,id',
    limit: -1,
    'filter[module_code][_eq]': historyTimelineModuleCode,
    'filter[item_type][_eq]': historyTimelineItemType,
    'filter[status][_eq]': 'enabled',
  }), { cache: 'no-store', next: { revalidate: false } });

  return (response.data || []).map((item): HistoryTimelineItem => ({
    id: String(item.id ?? ''),
    year: toText(item.date_label),
    title: toText(item.title),
    description: normalizeTimelineContent(toText(item.content)),
    sort: Number(item.sort) || 0,
  })).filter((item) => item.title);
}

export async function getPublicLeaders() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,module_code,item_type,title,subtitle,image,content,sort,status',
    sort: 'sort,id',
    limit: -1,
    'filter[module_code][_eq]': 'leaders',
    'filter[item_type][_eq]': 'leader',
    'filter[status][_eq]': 'enabled',
  }), { cache: 'no-store', next: { revalidate: false } });

  return (response.data || []).map((item) => ({
    id: String(item.id ?? ''),
    name: toText(item.title),
    position: toText(item.subtitle),
    photo: buildDirectusAssetUrl(toText(item.image)),
    speech: toText(item.content),
    sort: Number(item.sort) || 0,
  })).filter((item) => item.name);
}

export const honorsModuleCode = 'group-honors';
export const honorsItemType = 'honor';

const getStringExtra = (value: unknown, key: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === 'string' ? raw.trim() : '';
};

export async function getPublicHonors() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,module_code,item_type,title,date_label,image,content,link_url,sort,status,extra_json',
    sort: 'sort,-date_label,id',
    limit: -1,
    'filter[module_code][_eq]': honorsModuleCode,
    'filter[item_type][_eq]': honorsItemType,
    'filter[status][_eq]': 'enabled',
  }), { cache: 'no-store', next: { revalidate: false } });

  return (response.data || []).map((item): HonorItem => ({
    id: String(item.id ?? ''),
    title: toText(item.title),
    year: toText(item.date_label),
    image: buildDirectusAssetUrl(toText(item.image)),
    description: normalizeTimelineContent(toText(item.content)),
    attachmentUrl: buildDirectusAssetUrl(toText(item.link_url)),
    attachmentName: getStringExtra(item.extra_json, 'attachmentName'),
    sort: Number(item.sort) || 0,
  })).filter((item) => item.title);
}

export const trainingResourceModuleCode = 'training-resources';
const trainingResourceKinds = new Set<TrainingResourceKind>(['article', 'attachment', 'link']);

const parseExtraJson = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
};

const safeHttpUrl = (value: string) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : '';
  } catch {
    return '';
  }
};

const mapTrainingResource = (item: Record<string, unknown>): TrainingResource | null => {
  const kind = toText(item.item_type) as TrainingResourceKind;
  if (!trainingResourceKinds.has(kind)) return null;
  const extra = parseExtraJson(item.extra_json);
  const fileId = toText(extra.file_id) || toText(extra.fileId);
  const linkUrl = toText(item.link_url);
  const attachmentUrl = fileId ? buildDirectusAssetUrl(fileId) : '';
  return {
    id: String(item.id ?? ''),
    kind,
    title: toText(item.title),
    summary: toText(item.subtitle),
    dateLabel: toText(item.date_label),
    content: toText(item.content),
    image: buildDirectusAssetUrl(toText(item.image)),
    // 外部链接只接受 http/https；附件链接由后台文件 ID 生成，避免前台出现无效跳转。
    url: kind === 'attachment' ? attachmentUrl : kind === 'link' ? safeHttpUrl(linkUrl) : '',
    fileName: toText(extra.filename) || toText(extra.file_name),
    fileSize: Number(extra.filesize) || 0,
    sort: Number(item.sort) || 0,
  };
};

export async function getPublicTrainingResources() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,item_type,title,subtitle,date_label,image,content,link_url,sort,status,extra_json',
    sort: 'sort,id',
    limit: -1,
    'filter[module_code][_eq]': trainingResourceModuleCode,
    'filter[status][_eq]': 'enabled',
  }), { cache: 'no-store', next: { revalidate: false } });

  return (response.data || [])
    .map(mapTrainingResource)
    .filter((item): item is TrainingResource => Boolean(item && item.title));
}

export async function getPublicTrainingResourceById(id: string) {
  if (!id) return null;
  const resources = await getPublicTrainingResources();
  return resources.find((item) => item.id === id) || null;
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

type LegacyContactInfo = Partial<ContactInfoConfig>;

const readLegacyContactInfo = (rawExtra: unknown): LegacyContactInfo | null => {
  const extra = typeof rawExtra === 'string' ? JSON.parse(rawExtra) as unknown : rawExtra;
  const value = extra && typeof extra === 'object' && !Array.isArray(extra) && 'contactInfo' in extra
    ? (extra as Record<string, unknown>).contactInfo
    : null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const config = value as Record<string, unknown>;
  return {
    email: typeof config.email === 'string' ? config.email.trim() : undefined,
    phone: typeof config.phone === 'string' ? config.phone.trim() : undefined,
    address: typeof config.address === 'string' ? config.address.trim() : undefined,
    mapEmbedUrl: typeof config.mapEmbedUrl === 'string' ? normalizeMapEmbedUrl(config.mapEmbedUrl) : undefined,
  };
};

export async function getPublicContactInfo(): Promise<ContactInfoConfig> {
  const [siteSettings, legacyContactInfo] = await Promise.all([
    getPublicSiteSettings().catch(() => null),
    cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
      fields: 'extra_json,status',
      limit: 1,
      'filter[module_code][_eq]': contactInfoModuleCode,
      'filter[status][_eq]': 'published',
    }), { cache: 'no-store', next: { revalidate: false } })
      .then((response) => readLegacyContactInfo(response.data?.[0]?.extra_json))
      .catch(() => null),
  ]);

  // 仅有历史数据时回退首页布局旧字段；一旦保存过联系配置，就尊重空值，允许后台主动清空。
  const hasSavedContactConfig = (
    legacyContactInfo !== null
    || Boolean(siteSettings?.email || siteSettings?.phone || siteSettings?.address)
  );
  const homepage = hasSavedContactConfig ? defaultHomepageLayout : await getPublicHomepageLayout();

  return {
    email: siteSettings?.email.trim() || legacyContactInfo?.email || defaultContactInfo.email,
    phone: siteSettings?.phone.trim() || legacyContactInfo?.phone || homepage.contactPhone || defaultContactInfo.phone,
    address: siteSettings?.address.trim() || legacyContactInfo?.address || homepage.contactAddress || defaultContactInfo.address,
    mapEmbedUrl: legacyContactInfo?.mapEmbedUrl !== undefined ? legacyContactInfo.mapEmbedUrl : defaultContactInfo.mapEmbedUrl,
  };
}
