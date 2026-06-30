import { buildDirectusAssetUrl, buildDirectusPath, cmsFetch, cmsPublicFetch } from './client';
import { getPublicChannels, isNewsChannel, isNoticeChannel, type PublicScope } from './channels';
import type { Article, ArticleAttachment, Channel, DirectusListResponse, PublicArticleListPayload } from '@/types/cms';

const publishedFilter = 'filter[status][_eq]=published';

export async function getPublishedArticles(limit = 10) {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: '-publish_at',
    fields: 'id,title,slug,status,summary,cover,publish_at,main_channel.id,main_channel.name,main_channel.slug',
  });

  return cmsFetch<DirectusListResponse<Article>>(`/items/articles?${publishedFilter}&${params.toString()}`);
}

export async function getPublishedArticleById(id: string) {
  const params = new URLSearchParams({
    limit: '1',
    'filter[id][_eq]': id,
    fields: 'id,title,slug,status,summary,content,cover,publish_at,main_channel.id,main_channel.name,main_channel.slug',
  });

  const response = await cmsFetch<DirectusListResponse<Article>>(`/items/articles?${publishedFilter}&${params.toString()}`);
  return response.data[0] || null;
}

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const mapPublicArticleSummary = (item: Record<string, unknown>, channelMap = new Map<string, Channel>()): Article => {
  const rawChannel = item.main_channel;
  const rawChannelObject = rawChannel && typeof rawChannel === 'object' ? rawChannel as Record<string, unknown> : null;
  const rawChannelId = rawChannelObject ? rawChannelObject.id : rawChannel;
  const channelId = rawChannelId !== undefined && rawChannelId !== null && rawChannelId !== '' ? String(rawChannelId) : '';
  const fallbackChannel = channelId ? channelMap.get(channelId) : null;
  const mainChannel = channelId
    ? {
        id: channelId,
        name: toText(rawChannelObject?.name) || fallbackChannel?.name || '',
        slug: toText(rawChannelObject?.slug) || fallbackChannel?.slug || '',
      }
    : null;

  return {
    id: String(item.id ?? ''),
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    cover: buildDirectusAssetUrl(toText(item.cover) || toText(item.cover_url)),
    summary: toText(item.summary),
    source: toText(item.source),
    author: toText(item.author),
    publishAt: toText(item.publish_at),
    publishDate: item.publish_at ? String(item.publish_at).slice(0, 10) : '',
    status: toText(item.status) as Article['status'],
    isTop: item.is_top === true,
    isHomeRecommend: item.is_home_recommend === true,
    sort: Number(item.sort) || 0,
    newsSubcategory: toText(item.news_subcategory),
    mainChannel,
    main_channel: mainChannel || undefined,
  };
};

const getScope = (searchParams: URLSearchParams): PublicScope => {
  const type = (searchParams.get('type') || '').trim();
  const scope = (searchParams.get('scope') || '').trim();
  if (type === 'notice' || scope === 'notice') return 'notice';
  if (type === 'news' || scope === 'news') return 'news';
  return '';
};

export async function getPublicArticles(searchParams: URLSearchParams): Promise<PublicArticleListPayload> {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '10', 10) || 10));
  const scope = getScope(searchParams);
  const channelSlug = (searchParams.get('channelSlug') || searchParams.get('channel') || '').trim();
  const keyword = (searchParams.get('keyword') || '').trim();

  const allChannels = await getPublicChannels();
  const channelMap = new Map(allChannels.map((item) => [String(item.id), item]));
  const noticeChannels = allChannels.filter(isNoticeChannel);
  const newsChannels = allChannels.filter(isNewsChannel);
  const noticeChannelIds = noticeChannels.map((item) => item.id).filter(Boolean);
  const newsChannelIds = newsChannels.map((item) => item.id).filter(Boolean);
  const selectedChannel = channelSlug && channelSlug !== 'all'
    ? allChannels.find((item) => item.slug === channelSlug)
    : null;

  if (channelSlug && channelSlug !== 'all' && !selectedChannel) return { page, pageSize, total: 0, items: [] };
  if (scope === 'notice' && selectedChannel && !isNoticeChannel(selectedChannel)) return { page, pageSize, total: 0, items: [] };
  if (scope === 'news' && selectedChannel && !isNewsChannel(selectedChannel)) return { page, pageSize, total: 0, items: [] };
  if (scope === 'notice' && !selectedChannel && !noticeChannelIds.length) return { page, pageSize, total: 0, items: [] };
  if (scope === 'news' && !selectedChannel && !newsChannelIds.length) return { page, pageSize, total: 0, items: [] };

  const params: Record<string, string | number | boolean> = {
    fields: 'id,title,subtitle,cover,cover_url,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,news_subcategory,main_channel,main_channel.id,main_channel.name,main_channel.slug',
    sort: '-is_top,sort,-publish_at,-id',
    page,
    limit: pageSize,
    meta: 'filter_count',
    'filter[status][_eq]': 'published',
  };
  if (selectedChannel) {
    params['filter[main_channel][_eq]'] = selectedChannel.id;
  } else if (scope === 'notice') {
    params['filter[main_channel][_in]'] = noticeChannelIds.join(',');
  } else if (scope === 'news') {
    params['filter[main_channel][_in]'] = newsChannelIds.join(',');
  }
  if (keyword) params.search = keyword;

  const articles = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/articles', params));
  const items = Array.isArray(articles?.data) ? articles.data.map((item) => mapPublicArticleSummary(item, channelMap)) : [];
  return {
    page,
    pageSize,
    total: Number(articles?.meta?.filter_count || items.length),
    items,
  };
}

const mapPublicAttachments = (value: unknown): ArticleAttachment[] => {
  const rawAttachments = Array.isArray(value) ? value : [];
  return rawAttachments
    .map((att, index) => {
      if (!att || typeof att !== 'object') return null;
      const item = att as Record<string, unknown>;
      const file = item.file;
      const fileObject = file && typeof file === 'object' ? file as Record<string, unknown> : null;
      const title = toText(item.title) || toText(item.name) || `附件${index + 1}`;
      const url = toText(item.url)
        || (typeof file === 'string' ? buildDirectusAssetUrl(file) : '')
        || (fileObject?.id ? buildDirectusAssetUrl(String(fileObject.id)) : '')
        || (item.directus_files_id ? buildDirectusAssetUrl(String(item.directus_files_id)) : '')
        || (item.file_id ? buildDirectusAssetUrl(String(item.file_id)) : '');
      return url ? { title, url } : null;
    })
    .filter((item): item is ArticleAttachment => Boolean(item));
};

export async function getPublicArticleById(id: string): Promise<Article | null> {
  const rawId = String(id || '').trim();
  if (!rawId) return null;

  const allChannels = await getPublicChannels();
  const channelMap = new Map(allChannels.map((item) => [String(item.id), item]));
  const article = await cmsPublicFetch<{ data?: Record<string, unknown> }>(buildDirectusPath(`/items/articles/${encodeURIComponent(rawId)}`, {
    fields: '*.*',
  }));
  const item = article?.data || null;
  if (!item || item.status !== 'published') return null;

  const content = toText(item.content)
    || toText(item.content_html)
    || toText(item.body)
    || toText(item.body_html)
    || toText(item.html)
    || toText(item.rich_text)
    || toText(item.text);

  return {
    ...mapPublicArticleSummary(item, channelMap),
    content,
    attachments: mapPublicAttachments(item.attachments),
  };
}

export async function getPublicNewsTotal() {
  const channels = await getPublicChannels('news');
  const newsChannelIds = channels.map((item) => item.id).filter(Boolean);
  if (!newsChannelIds.length) return 0;

  const articles = await cmsPublicFetch<DirectusListResponse<{ id: string }>>(buildDirectusPath('/items/articles', {
    fields: 'id',
    limit: 1,
    meta: 'filter_count',
    'filter[status][_eq]': 'published',
    'filter[main_channel][_in]': newsChannelIds.join(','),
  }));
  return Number(articles?.meta?.filter_count || 0);
}
