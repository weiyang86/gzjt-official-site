import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import type {
  DirectusListResponse,
  ResponsibilityAttachment,
  ResponsibilityCategory,
  ResponsibilityContent,
  ResponsibilityItem,
} from '@/types/cms';

const responsibilityModuleCode = 'social-responsibility';
const responsibilityCategories: ResponsibilityCategory[] = ['report', 'case', 'activity'];

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const readJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const toCategory = (value: unknown): ResponsibilityCategory | null => {
  const type = toText(value);
  return responsibilityCategories.includes(type as ResponsibilityCategory) ? type as ResponsibilityCategory : null;
};

const mapAttachment = (value: unknown): ResponsibilityAttachment | null => {
  if (typeof value === 'string') {
    const id = value.trim();
    return id ? { id, name: id } : null;
  }
  const row = readJsonObject(value);
  const id = toText(row.id) || toText(row.file) || toText(row.file_id);
  if (!id) return null;
  const size = Number(row.size);
  return {
    id,
    name: toText(row.name) || toText(row.filename) || id,
    ...(Number.isFinite(size) && size > 0 ? { size } : {}),
  };
};

const mapAttachments = (extra: Record<string, unknown>) => {
  const rows = Array.isArray(extra.attachments) ? extra.attachments : [];
  return rows.map(mapAttachment).filter((item): item is ResponsibilityAttachment => Boolean(item));
};

export async function getPublicResponsibilityContent(): Promise<ResponsibilityContent | null> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
    'filter[module_code][_eq]': responsibilityModuleCode,
    'filter[status][_eq]': 'published',
    limit: 1,
    fields: 'id,module_code,title,subtitle,cover,summary,content,status',
  }));
  const item = response.data?.[0];
  if (!item) return null;
  return {
    id: String(item.id ?? ''),
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    summary: toText(item.summary),
    content: toText(item.content),
  };
}

export async function getPublicResponsibilityItems(): Promise<ResponsibilityItem[]> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    'filter[module_code][_eq]': responsibilityModuleCode,
    'filter[item_type][_in]': responsibilityCategories.join(','),
    'filter[status][_eq]': 'enabled',
    sort: 'sort,id',
    limit: -1,
    fields: 'id,module_code,item_type,title,subtitle,date_label,image,content,link_url,sort,status,extra_json',
  }));

  return (response.data || []).flatMap((item) => {
    const category = toCategory(item.item_type);
    if (!category) return [];
    const extra = readJsonObject(item.extra_json);
    return [{
      id: String(item.id ?? ''),
      category,
      title: toText(item.title),
      summary: toText(item.subtitle) || toText(extra.summary),
      year: toText(item.date_label),
      image: buildDirectusAssetUrl(toText(item.image)),
      content: toText(item.content),
      linkUrl: toText(item.link_url) || toText(extra.link_url),
      attachments: mapAttachments(extra),
      sort: Number(item.sort) || 0,
    }];
  });
}
