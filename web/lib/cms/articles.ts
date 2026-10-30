import { buildDirectusAssetUrl, buildDirectusPath, cmsFetch, cmsPublicFetch, normalizePublicAssetUrl } from './client';
import { getPublicChannels, isNewsChannel, isNoticeChannel, type PublicScope } from './channels';
import type { Article, ArticleAttachment, Channel, DirectusListResponse, PublicArticleListPayload } from '@/types/cms';

const publishedFilter = 'filter[status][_eq]=published';
const realtimeCmsInit = { cache: 'no-store' as const, next: { revalidate: false as const } };

export async function getPublishedArticles(limit = 10) {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: '-publish_at',
    fields: 'id,title,slug,status,summary,cover,publish_at,main_channel.id,main_channel.name,main_channel.slug',
  });

  return cmsFetch<DirectusListResponse<Article>>(`/items/articles?${publishedFilter}&${params.toString()}`, realtimeCmsInit);
}

export async function getPublishedArticleById(id: string) {
  const params = new URLSearchParams({
    limit: '1',
    'filter[id][_eq]': id,
    fields: 'id,title,slug,status,summary,content,cover,publish_at,main_channel.id,main_channel.name,main_channel.slug',
  });

  const response = await cmsFetch<DirectusListResponse<Article>>(`/items/articles?${publishedFilter}&${params.toString()}`, realtimeCmsInit);
  return response.data[0] || null;
}

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const toAssetValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const file = value as Record<string, unknown>;
    return toText(file.id) || toText(file.filename_disk) || toText(file.filename_download) || toText(file.url);
  }
  return '';
};

export const normalizeRichTextAssetUrls = (html: string) => {
  if (!html) return '';

  const rewriteUrl = (value: string) => normalizePublicAssetUrl(value) || value;

  const normalizedAttributes = html.replace(
    /\b(src|href|poster)=("([^"]*)"|'([^']*)')/gi,
    (match, attr, quoted, doubleQuotedValue, singleQuotedValue) => {
      const rawValue = typeof doubleQuotedValue === 'string' ? doubleQuotedValue : singleQuotedValue;
      const nextValue = rewriteUrl(rawValue);
      if (!nextValue || nextValue === rawValue) return match;
      const quote = quoted.startsWith("'") ? "'" : '"';
      return `${attr}=${quote}${nextValue}${quote}`;
    },
  );

  return normalizedAttributes.replace(
    /\bsrcset=("([^"]*)"|'([^']*)')/gi,
    (match, quoted, doubleQuotedValue, singleQuotedValue) => {
      const rawValue = typeof doubleQuotedValue === 'string' ? doubleQuotedValue : singleQuotedValue;
      const nextValue = rawValue
        .split(',')
        .map((entry: string) => {
          const trimmed = entry.trim();
          if (!trimmed) return trimmed;
          const [url, descriptor] = trimmed.split(/\s+/, 2);
          const nextUrl = rewriteUrl(url);
          return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
        })
        .join(', ');
      if (!nextValue || nextValue === rawValue) return match;
      const quote = quoted.startsWith("'") ? "'" : '"';
      return `srcset=${quote}${nextValue}${quote}`;
    },
  );
};

const mapPublicArticleSummary = (item: Record<string, unknown>, channelMap = new Map<string, Channel>()): Article => {
  const rawChannels = Array.isArray(item.main_channel) ? item.main_channel : item.main_channel ? [item.main_channel] : [];
  const mainChannels = rawChannels.flatMap<Channel>((rawChannel) => {
    const rawChannelObject = rawChannel && typeof rawChannel === 'object' ? rawChannel as Record<string, unknown> : null;
    const rawChannelId = rawChannelObject ? rawChannelObject.id : rawChannel;
    const channelId = rawChannelId !== undefined && rawChannelId !== null && rawChannelId !== '' ? String(rawChannelId) : '';
    const fallbackChannel = channelId ? channelMap.get(channelId) : null;
    return channelId ? [{
      id: channelId,
      name: toText(rawChannelObject?.name) || fallbackChannel?.name || '',
      slug: toText(rawChannelObject?.slug) || fallbackChannel?.slug || '',
      type: toText(rawChannelObject?.type) || fallbackChannel?.type || '',
      path: toText(rawChannelObject?.path) || fallbackChannel?.path || '',
    }] : [];
  });
  const mainChannel = mainChannels[0] || null;

  return {
    id: String(item.id ?? ''),
    title: toText(item.title),
    subtitle: toText(item.subtitle),
    cover: buildDirectusAssetUrl(toAssetValue(item.cover) || toText(item.cover_url)),
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
    mainChannels,
    main_channels: mainChannels,
  };
};

export async function getPublicArticlesByIds(ids: string[]): Promise<Article[]> {
  const uniqueIds = Array.from(new Set(ids.map((item) => String(item || '').trim()).filter(Boolean)));
  if (!uniqueIds.length) return [];

  const allChannels = await getPublicChannels();
  const channelMap = new Map(allChannels.map((item) => [String(item.id), item]));
  const articles = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/articles', {
    fields: 'id,title,subtitle,cover,cover_url,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,news_subcategory,main_channel,main_channel.id,main_channel.name,main_channel.slug',
    limit: -1,
    'filter[id][_in]': uniqueIds.join(','),
    'filter[status][_eq]': 'published',
  }), realtimeCmsInit);

  return (Array.isArray(articles?.data) ? articles.data : []).map((item) => mapPublicArticleSummary(item, channelMap));
}

const getScope = (searchParams: URLSearchParams): PublicScope => {
  const type = (searchParams.get('type') || '').trim();
  const scope = (searchParams.get('scope') || '').trim();
  if (type === 'notice' || scope === 'notice') return 'notice';
  if (type === 'news' || scope === 'news') return 'news';
  return '';
};

export async function getPublicArticles(searchParams: URLSearchParams, companyId = ''): Promise<PublicArticleListPayload> {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '10', 10) || 10));
  const scope = getScope(searchParams);
  const channelSlug = (searchParams.get('channelSlug') || searchParams.get('channel') || '').trim();
  const channelRootSlug = (searchParams.get('channelRoot') || '').trim();
  const includeChildren = scope === 'news' && searchParams.get('includeChildren') === 'true';
  const keyword = (searchParams.get('keyword') || '').trim();

  const allChannels = await getPublicChannels();
  const channelMap = new Map(allChannels.map((item) => [String(item.id), item]));
  const noticeChannels = allChannels.filter(isNoticeChannel);
  const newsChannels = allChannels.filter((channel) => isNewsChannel(channel, allChannels));
  const noticeChannelIds = noticeChannels.map((item) => item.id).filter(Boolean);
  const newsChannelIds = newsChannels.map((item) => item.id).filter(Boolean);
  const selectedChannel = channelSlug && channelSlug !== 'all'
    ? allChannels.find((item) => item.slug === channelSlug)
    : null;
  const selectedRoot = channelRootSlug ? allChannels.find((item) => item.slug === channelRootSlug) : null;
  const collectNewsTreeIds = (rootId: string) => {
    const ids = new Set([rootId]);
    const visit = (parentId: string) => allChannels
      .filter((channel) => channel.parent === parentId && isNewsChannel(channel, allChannels))
      .forEach((channel) => {
        if (ids.has(channel.id)) return;
        ids.add(channel.id);
        visit(channel.id);
      });
    visit(rootId);
    return Array.from(ids);
  };
  const selectedRootIds = selectedRoot && isNewsChannel(selectedRoot, allChannels)
    ? collectNewsTreeIds(selectedRoot.id)
    : [];
  const selectedInRoot = Boolean(selectedChannel && selectedRootIds.includes(selectedChannel.id));

  if (channelSlug && channelSlug !== 'all' && !selectedChannel) return { page, pageSize, total: 0, items: [] };
  if (channelRootSlug && !selectedRootIds.length) return { page, pageSize, total: 0, items: [] };
  if (selectedRoot && channelSlug && channelSlug !== 'all' && !selectedInRoot) return { page, pageSize, total: 0, items: [] };
  if (scope === 'notice' && selectedChannel && !isNoticeChannel(selectedChannel)) return { page, pageSize, total: 0, items: [] };
  if (scope === 'news' && selectedChannel && !isNewsChannel(selectedChannel, allChannels)) return { page, pageSize, total: 0, items: [] };
  if (scope === 'notice' && !selectedChannel && !noticeChannelIds.length) return { page, pageSize, total: 0, items: [] };
  if (scope === 'news' && !selectedChannel && !newsChannelIds.length) return { page, pageSize, total: 0, items: [] };

  const params: Record<string, string | number | boolean> = {
    fields: 'id,title,subtitle,cover,cover_url,summary,source,author,publish_at,status,is_top,is_home_recommend,sort,news_subcategory,main_channel,main_channel.id,main_channel.name,main_channel.slug',
    sort: '-publish_at,-id',
    page,
    limit: pageSize,
    meta: 'filter_count',
    'filter[status][_eq]': 'published',
  };
  if (companyId) {
    params['filter[related_company][_eq]'] = companyId;
  } else if (selectedChannel && includeChildren) {
    params['filter[main_channel][_in]'] = collectNewsTreeIds(selectedChannel.id).join(',');
  } else if (selectedChannel) {
    params['filter[main_channel][_eq]'] = selectedChannel.id;
  } else if (selectedRootIds.length) {
    params['filter[main_channel][_in]'] = selectedRootIds.join(',');
  } else if (scope === 'notice') {
    params['filter[main_channel][_in]'] = noticeChannelIds.join(',');
  } else if (scope === 'news') {
    params['filter[main_channel][_in]'] = newsChannelIds.join(',');
  }
  if (keyword) params.search = keyword;
  // 首页需要单独拉取置顶文章，避免置顶内容因发布时间较早而落在最新列表之外。
  if (searchParams.get('isTop') === 'true') params['filter[is_top][_eq]'] = true;

  const articles = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/articles', params), realtimeCmsInit);
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
  }), realtimeCmsInit);
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
    content: normalizeRichTextAssetUrls(content),
    attachments: mapPublicAttachments(item.attachments),
  };
}

export async function getPreviewArticleById(id: string): Promise<Article | null> {
  const rawId = String(id || '').trim();
  if (!rawId) return null;

  const allChannels = await getPublicChannels();
  const channelMap = new Map(allChannels.map((item) => [String(item.id), item]));
  const article = await cmsPublicFetch<{ data?: Record<string, unknown> }>(buildDirectusPath(`/items/articles/${encodeURIComponent(rawId)}`, {
    fields: '*.*',
  }), realtimeCmsInit);
  const item = article?.data || null;
  if (!item) return null;

  const content = toText(item.content)
    || toText(item.content_html)
    || toText(item.body)
    || toText(item.body_html)
    || toText(item.html)
    || toText(item.rich_text)
    || toText(item.text);

  return {
    ...mapPublicArticleSummary(item, channelMap),
    content: normalizeRichTextAssetUrls(content),
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
  }), realtimeCmsInit);
  return Number(articles?.meta?.filter_count || 0);
}
