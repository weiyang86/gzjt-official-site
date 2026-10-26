import { buildDirectusPath, cmsPublicFetch } from './client';
import type { DirectusListResponse, DownloadItem, PageModuleContent } from '@/types/cms';

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const readExtra = (value: unknown): Record<string, unknown> => {
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

export async function getPublicDownloads() {
  try {
    const [contentResponse, itemResponse] = await Promise.all([
      cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
        'filter[module_code][_eq]': 'downloads',
        'filter[status][_eq]': 'published',
        limit: 1,
        fields: 'id,module_code,title,subtitle,summary,content,status',
      })),
      cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
        'filter[module_code][_eq]': 'downloads',
        'filter[item_type][_eq]': 'link',
        'filter[status][_eq]': 'enabled',
        sort: 'sort,id',
        limit: -1,
        fields: 'id,title,subtitle,date_label,link_url,extra_json,sort,status',
      })),
    ]);

    const contentRow = contentResponse.data?.[0];
    const content: PageModuleContent | null = contentRow ? {
      id: String(contentRow.id ?? ''),
      moduleCode: toText(contentRow.module_code),
      title: toText(contentRow.title),
      subtitle: toText(contentRow.subtitle),
      summary: toText(contentRow.summary),
      content: toText(contentRow.content),
    } : null;

    const items = (itemResponse.data || []).map((item): DownloadItem => {
      const extra = readExtra(item.extra_json);
      const fileId = toText(extra.file_id);
      const linkUrl = toText(item.link_url);
      return {
        id: String(item.id ?? ''),
        title: toText(item.title),
        category: toText(extra.category) || toText(item.subtitle) || '其他',
        date: toText(item.date_label),
        fileId,
        url: linkUrl || (fileId ? `/api/public/cms/assets/${encodeURIComponent(fileId)}` : ''),
        filename: toText(extra.filename),
        filesize: Number(extra.filesize) || 0,
        sort: Number(item.sort) || 0,
      };
    }).filter((item) => item.title);

    return { content, items };
  } catch {
    return { content: null, items: [] };
  }
}
