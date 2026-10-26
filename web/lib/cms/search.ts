import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import { getPublicArticles } from './articles';
import type { DirectusListResponse } from '@/types/cms';

export type SearchResultType = 'news' | 'notice' | 'page' | 'company' | 'sector';
export type SearchTypeFilter = 'all' | SearchResultType;

export type SearchResultItem = {
  id: string;
  type: SearchResultType;
  typeLabel: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  category: string;
  cover: string;
};

export type SearchPayload = {
  keyword: string;
  type: SearchTypeFilter;
  page: number;
  pageSize: number;
  total: number;
  counts: Record<SearchResultType, number>;
  items: SearchResultItem[];
  errors: string[];
};

export const searchTypeLabels: Record<SearchResultType, string> = {
  news: '新闻',
  notice: '公告',
  page: '页面',
  company: '下属公司',
  sector: '业务板块',
};

const searchTypeValues: SearchTypeFilter[] = ['all', 'news', 'notice', 'page', 'company', 'sector'];

// 单页 slug 与前台路由的映射关系，仅收录已知可访问的页面，避免搜索结果产生死链。
const pageSlugPaths: Record<string, string> = {
  about: '/about',
  'group-intro': '/about',
  contact: '/contact-us',
  'contact-us': '/contact-us',
  projects: '/projects',
  'clean-gov': '/clean-gov',
  responsibility: '/social-responsibility',
  'social-responsibility': '/social-responsibility',
  business: '/business-dev',
  'business-dev': '/business-dev',
  home: '/home',
  news: '/news',
  disclosure: '/disclosure',
  org: '/org',
};

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const stripHtml = (value: string) => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const sliceSummary = (value: string, length = 160) => value.length > length ? `${value.slice(0, length)}…` : value;

type ScopeResult = { items: SearchResultItem[]; total: number };

async function searchArticleScope(keyword: string, scope: 'news' | 'notice', limit: number): Promise<ScopeResult> {
  const payload = await getPublicArticles(new URLSearchParams({
    scope,
    keyword,
    page: '1',
    pageSize: String(limit),
  }));
  return {
    total: payload.total,
    items: payload.items.map((item) => ({
      id: item.id,
      type: scope,
      typeLabel: searchTypeLabels[scope],
      title: item.title,
      summary: sliceSummary(item.summary || ''),
      url: `/news/${encodeURIComponent(item.id)}`,
      date: item.publishAt || item.publishDate || '',
      category: item.mainChannel?.name || (scope === 'notice' ? '公示公告' : '新闻中心'),
      cover: item.cover || '',
    })),
  };
}

async function searchPages(keyword: string, limit: number): Promise<ScopeResult> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/pages', {
    fields: 'id,title,slug,cover,content,status',
    limit,
    'filter[status][_eq]': 'published',
    search: keyword,
  }));
  const items = (response.data || []).flatMap<SearchResultItem>((item) => {
    const slug = toText(item.slug);
    const url = pageSlugPaths[slug];
    if (!url) return [];
    return [{
      id: String(item.id ?? slug),
      type: 'page',
      typeLabel: searchTypeLabels.page,
      title: toText(item.title) || slug,
      summary: sliceSummary(stripHtml(toText(item.content))),
      url,
      date: '',
      category: '页面',
      cover: buildDirectusAssetUrl(toText(item.cover)),
    }];
  });
  return { items, total: items.length };
}

async function searchCompanies(keyword: string, limit: number): Promise<ScopeResult> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/companies', {
    fields: 'id,name,short_name,slug,intro,cover,status',
    limit,
    'filter[status][_eq]': 'enabled',
    search: keyword,
  }));
  return {
    total: Number(response.meta?.filter_count || (response.data || []).length),
    items: (response.data || []).map((item) => {
      const slug = toText(item.slug) || String(item.id ?? '');
      return {
        id: String(item.id ?? slug),
        type: 'company' as const,
        typeLabel: searchTypeLabels.company,
        title: toText(item.name) || toText(item.short_name) || '下属公司',
        summary: sliceSummary(toText(item.intro)),
        url: `/org/${encodeURIComponent(slug)}`,
        date: '',
        category: toText(item.short_name) || '下属公司',
        cover: buildDirectusAssetUrl(toText(item.cover) || toText(item.logo)),
      };
    }),
  };
}

async function searchSectors(keyword: string, limit: number): Promise<ScopeResult> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/business_sectors', {
    fields: 'id,name,slug,intro,cover,status',
    limit,
    'filter[status][_eq]': 'enabled',
    search: keyword,
  }));
  return {
    total: Number(response.meta?.filter_count || (response.data || []).length),
    items: (response.data || []).map((item) => ({
      id: String(item.id ?? ''),
      type: 'sector' as const,
      typeLabel: searchTypeLabels.sector,
      title: toText(item.name) || '业务板块',
      summary: sliceSummary(toText(item.intro)),
      url: '/business-dev#sectors',
      date: '',
      category: '业务板块',
      cover: buildDirectusAssetUrl(toText(item.cover)),
    })),
  };
}

const emptyCounts = (): Record<SearchResultType, number> => ({ news: 0, notice: 0, page: 0, company: 0, sector: 0 });

export async function searchSite(rawParams: URLSearchParams): Promise<SearchPayload> {
  const keyword = (rawParams.get('q') || rawParams.get('keyword') || '').trim().slice(0, 60);
  const rawType = (rawParams.get('type') || 'all').trim() as SearchTypeFilter;
  const type = searchTypeValues.includes(rawType) ? rawType : 'all';
  const page = Math.max(1, Number.parseInt(rawParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(20, Math.max(1, Number.parseInt(rawParams.get('pageSize') || '10', 10) || 10));
  const counts = emptyCounts();

  if (!keyword) {
    return { keyword: '', type, page: 1, pageSize, total: 0, counts, items: [], errors: [] };
  }

  // 合并浏览时按当前页码向后取数，单类型最多读取 100 条，避免一次拉取过多数据。
  const perTypeLimit = Math.min(100, Math.max(pageSize * page, 20));
  const tasks: Array<{ key: SearchResultType; run: () => Promise<ScopeResult> }> = [
    { key: 'news', run: () => searchArticleScope(keyword, 'news', perTypeLimit) },
    { key: 'notice', run: () => searchArticleScope(keyword, 'notice', perTypeLimit) },
    { key: 'page', run: () => searchPages(keyword, perTypeLimit) },
    { key: 'company', run: () => searchCompanies(keyword, perTypeLimit) },
    { key: 'sector', run: () => searchSectors(keyword, perTypeLimit) },
  ];

  const settled = await Promise.all(tasks.map(async (task) => {
    try {
      const result = await task.run();
      return { key: task.key, items: result.items, total: result.total, failed: false };
    } catch {
      return { key: task.key, items: [] as SearchResultItem[], total: 0, failed: true };
    }
  }));

  const allItems: SearchResultItem[] = [];
  settled.forEach((result) => {
    counts[result.key] = result.total;
    allItems.push(...result.items);
  });

  const needle = keyword.toLowerCase();
  const scoreOf = (item: SearchResultItem) => {
    const title = item.title.toLowerCase();
    const summary = item.summary.toLowerCase();
    let score = 0;
    if (title === needle) score += 3;
    if (title.includes(needle)) score += 2;
    if (summary.includes(needle)) score += 1;
    return score;
  };

  const filtered = type === 'all' ? allItems : allItems.filter((item) => item.type === type);
  filtered.sort((a, b) => (
    scoreOf(b) - scoreOf(a)
    || (b.date || '').localeCompare(a.date || '')
    || a.title.localeCompare(b.title, 'zh-CN')
  ));

  const total = type === 'all'
    ? Object.values(counts).reduce((sum, value) => sum + value, 0)
    : counts[type];
  const start = (page - 1) * pageSize;

  return {
    keyword,
    type,
    page,
    pageSize,
    total,
    counts,
    items: filtered.slice(start, start + pageSize),
    errors: settled.filter((result) => result.failed).map((result) => searchTypeLabels[result.key]),
  };
}
