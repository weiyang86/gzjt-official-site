import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import type { DirectusListResponse, HonorContent, HonorItem } from '@/types/cms';

const toText = (value: unknown) => typeof value === 'string' ? value : '';

export async function getPublicHonors() {
  try {
    const [contentResponse, itemResponse] = await Promise.all([
      cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
        'filter[module_code][_eq]': 'honors',
        'filter[status][_eq]': 'published',
        limit: 1,
        fields: 'id,module_code,title,subtitle,summary,content,status',
      })),
      cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
        'filter[module_code][_eq]': 'honors',
        'filter[item_type][_eq]': 'image',
        'filter[status][_eq]': 'enabled',
        sort: 'sort,id',
        limit: -1,
        fields: 'id,title,subtitle,date_label,image,content,sort,status',
      })),
    ]);

    const contentRow = contentResponse.data?.[0];
    const content: HonorContent | null = contentRow ? {
      title: toText(contentRow.title),
      subtitle: toText(contentRow.subtitle),
      summary: toText(contentRow.summary),
      content: toText(contentRow.content),
    } : null;

    const items = (itemResponse.data || []).map((item): HonorItem => ({
      id: String(item.id ?? ''),
      title: toText(item.title),
      issuer: toText(item.subtitle),
      year: toText(item.date_label),
      image: buildDirectusAssetUrl(toText(item.image)),
      description: toText(item.content),
      sort: Number(item.sort) || 0,
    })).filter((item) => item.title);

    return { content, items };
  } catch {
    return { content: null, items: [] };
  }
}
