import { buildDirectusPath, cmsPublicFetch } from './client';
import { getPublicArticles } from './articles';
import {
  defaultReportConfig,
  normalizeReportConfig,
  reportConfigModuleCode,
  type ReportConfig,
} from '@/lib/report/config';
import type { Article, DirectusListResponse } from '@/types/cms';

const realtimeCmsInit = { cache: 'no-store' as const, next: { revalidate: false as const } };

export async function getPublicReportConfig(): Promise<ReportConfig> {
  try {
    const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
      fields: 'extra_json,status',
      limit: 1,
      'filter[module_code][_eq]': reportConfigModuleCode,
      'filter[status][_eq]': 'published',
    }), realtimeCmsInit);
    const rawValue = response.data?.[0]?.extra_json;
    const value = typeof rawValue === 'string' ? JSON.parse(rawValue) as unknown : rawValue;
    return normalizeReportConfig(value);
  } catch {
    // 后台尚未发布举报入口配置或数据接口暂不可用时回退默认值，不影响页面其它内容渲染。
    return defaultReportConfig;
  }
}

export async function getPublicReportArticles(config: ReportConfig): Promise<Article[]> {
  const slug = config.articleChannelSlug.trim();
  if (!slug) return [];
  try {
    const payload = await getPublicArticles(new URLSearchParams({
      scope: 'news',
      channel: slug,
      includeChildren: 'true',
      page: '1',
      pageSize: String(config.articlePageSize),
    }));
    return payload.items;
  } catch {
    return [];
  }
}
