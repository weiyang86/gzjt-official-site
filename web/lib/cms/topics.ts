import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import { getPublicArticlesByIds } from './articles';
import type { DirectusListResponse, Topic, TopicArticle } from '@/types/cms';

const topicModulePrefix = 'topic-';
const realtimeCmsInit = { cache: 'no-store' as const, next: { revalidate: false as const } };
const topicFields = 'id,module_code,title,subtitle,cover,summary,content,extra_json,status';

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

export const topicModuleCode = (slug: string) => `${topicModulePrefix}${slug}`;

export const topicSlugFromModuleCode = (moduleCode: string) => (
  moduleCode.startsWith(topicModulePrefix) ? moduleCode.slice(topicModulePrefix.length) : ''
);

const mapTopic = (item: Record<string, unknown>, articleCount?: number): Topic => {
  const moduleCode = toText(item.module_code);
  const extra = readExtra(item.extra_json);
  return {
    id: String(item.id ?? ''),
    slug: topicSlugFromModuleCode(moduleCode),
    moduleCode,
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    summary: toText(item.summary),
    content: toText(item.content),
    status: toText(item.status) as Topic['status'],
    sort: Number(extra.sort) || 0,
    articleCount,
  };
};

const articleIdOf = (item: Record<string, unknown>) => {
  const extra = readExtra(item.extra_json);
  const fromExtra = toText(extra.article_id) || toText(extra.articleId);
  if (fromExtra) return fromExtra;
  const linkUrl = toText(item.link_url);
  const matched = linkUrl.match(/\/news\/([^/?#]+)/);
  return matched ? decodeURIComponent(matched[1]) : '';
};

export async function getPublicTopics(includeCounts = true): Promise<Topic[]> {
  const [contents, items] = await Promise.all([
    cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
      fields: topicFields,
      limit: -1,
      'filter[module_code][_starts_with]': topicModulePrefix,
      'filter[status][_eq]': 'published',
    }), realtimeCmsInit),
    includeCounts
      ? cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
        fields: 'id,module_code,link_url,extra_json',
        limit: -1,
        'filter[module_code][_starts_with]': topicModulePrefix,
        'filter[item_type][_eq]': 'article',
        'filter[status][_eq]': 'enabled',
      }), realtimeCmsInit)
      : Promise.resolve({ data: [] } as DirectusListResponse<Record<string, unknown>>),
  ]);

  const countMap = new Map<string, number>();
  if (includeCounts) {
    const rows = items.data || [];
    const articleIds = Array.from(new Set(rows.map((item) => articleIdOf(item)).filter(Boolean)));
    const articles = articleIds.length ? await getPublicArticlesByIds(articleIds) : [];
    const publishedIds = new Set(articles.map((article) => article.id));
    rows.forEach((item) => {
      const moduleCode = toText(item.module_code);
      const articleId = articleIdOf(item);
      if (!moduleCode || !articleId || !publishedIds.has(articleId)) return;
      countMap.set(moduleCode, (countMap.get(moduleCode) || 0) + 1);
    });
  }

  return (contents.data || [])
    .map((item) => mapTopic(item, includeCounts ? (countMap.get(toText(item.module_code)) || 0) : undefined))
    .filter((item) => item.slug && item.title)
    .sort((a, b) => (a.sort - b.sort) || a.title.localeCompare(b.title, 'zh-CN'));
}

export async function getPublicTopicBySlug(slug: string): Promise<Topic | null> {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalizedSlug)) return null;

  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
    fields: topicFields,
    limit: 1,
    'filter[module_code][_eq]': topicModuleCode(normalizedSlug),
    'filter[status][_eq]': 'published',
  }), realtimeCmsInit);

  const item = response.data?.[0];
  if (!item) return null;
  const topic = mapTopic(item);
  return topic.slug && topic.title ? topic : null;
}

export async function getPublicTopicArticles(moduleCode: string): Promise<TopicArticle[]> {
  if (!moduleCode) return [];

  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: 'id,module_code,item_type,title,link_url,sort,status,extra_json',
    limit: -1,
    sort: 'sort,id',
    'filter[module_code][_eq]': moduleCode,
    'filter[item_type][_eq]': 'article',
    'filter[status][_eq]': 'enabled',
  }), realtimeCmsInit);

  const rows = Array.isArray(response.data) ? response.data : [];
  const articleIds = rows.map((item) => articleIdOf(item)).filter(Boolean);
  if (!articleIds.length) return [];

  const articles = await getPublicArticlesByIds(articleIds);
  const articleMap = new Map(articles.map((article) => [article.id, article]));

  return rows.flatMap<TopicArticle>((item) => {
    const articleId = articleIdOf(item);
    const article = articleMap.get(articleId);
    if (!article) return [];
    return [{
      id: String(item.id ?? ''),
      articleId,
      title: article.title,
      summary: article.summary || '',
      status: article.status,
      publishAt: article.publishAt || article.publishDate,
      cover: article.cover,
      sort: Number(item.sort) || 0,
      itemStatus: 'enabled',
      missing: false,
    }];
  });
}
