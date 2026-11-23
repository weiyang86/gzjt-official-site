import type { Metadata } from 'next';
import { fallbackNewsChannels, getFallbackNewsPayload } from '@/lib/cms/fallback-news';
import { getPublicArticles, getPublicChannels, isNewsChannel } from '@/lib/cms';
import { buildSeoMetadata } from '@/lib/cms/seo';
import { Drawer, Footer, Header, NewsAssets } from './components';
import { getAllArticleStats, withArticleStatBase } from '@/lib/article-stats/store';
import type { Channel, PublicArticleListPayload } from '@/types/cms';

export const dynamic = 'force-dynamic';

type NewsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const toSearchParams = (source: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value[0]) params.set(key, value[0]);
      return;
    }
    if (value) params.set(key, value);
  });
  return params;
};

const getFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const formatDotDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const buildHref = (params: { channel?: string; channelRoot?: string; keyword?: string; page?: number; includeChildren?: boolean }) => {
  const search = new URLSearchParams();
  if (params.channel && params.channel !== 'all') search.set('channel', params.channel);
  if (params.channelRoot) search.set('channelRoot', params.channelRoot);
  if (params.includeChildren) search.set('includeChildren', 'true');
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  const query = search.toString();
  return query ? `/news?${query}` : '/news';
};

export async function generateMetadata({ searchParams }: NewsPageProps): Promise<Metadata> {
  const rawSearchParams = await searchParams;
  const keyword = getFirst(rawSearchParams.keyword) || '';
  return buildSeoMetadata({ path: '/news', noIndex: Boolean(keyword) });
}

async function loadNews(searchParams: URLSearchParams) {
  const withScope = new URLSearchParams(searchParams);
  withScope.set('scope', 'news');
  withScope.set('pageSize', withScope.get('pageSize') || '8');
  const requestedRootSlug = withScope.get('channelRoot') || '';
  withScope.delete('channelRoot');
  const channel = withScope.get('channel') || 'all';
  if (channel !== 'all') withScope.set('channelSlug', channel);

  try {
    const apiChannels = await getPublicChannels();
    const channels = apiChannels.length ? apiChannels : fallbackNewsChannels;
    const newsRoot = channels.find(isNewsCenter);
    const selected = channels.find((item) => item.slug === channel);
    const byId = new Map(channels.map((item) => [item.id, item]));
    let sectionRoot = selected || channels.find((item) => item.slug === requestedRootSlug);
    const visited = new Set<string>();
    while (selected && sectionRoot?.parent && !visited.has(sectionRoot.id)) {
      visited.add(sectionRoot.id);
      sectionRoot = byId.get(sectionRoot.parent);
    }
    if (!sectionRoot || !isNewsChannel(sectionRoot, channels) || (selected && !isWithinChannelTree(selected, sectionRoot, channels))) {
      sectionRoot = newsRoot;
    }
    if (sectionRoot) withScope.set('channelRoot', sectionRoot.slug);
    const payload = apiChannels.length ? await getPublicArticles(withScope) : getFallbackNewsPayload(withScope);
    return {
      channels,
      payload,
      channelRoot: sectionRoot?.slug || '',
      sectionRoot,
      isFallback: false,
    };
  } catch {
    const fallbackParams = new URLSearchParams(withScope);
    fallbackParams.set('channelRoot', 'news-center');
    return {
      channels: fallbackNewsChannels,
      payload: getFallbackNewsPayload(fallbackParams),
      channelRoot: 'news-center',
      sectionRoot: fallbackNewsChannels.find(isNewsCenter),
      isFallback: true,
    };
  }
}

type FilterRow = {
  label: string;
  channels: Array<{ item: Channel; hasChildren: boolean }>;
  activeSlug: string;
  channelRoot: string;
  allHref: string;
  allActive: boolean;
};

function Pager({ payload, channel, channelRoot, keyword, includeChildren }: { payload: PublicArticleListPayload; channel: string; channelRoot: string; keyword: string; includeChildren: boolean }) {
  const pages = Math.max(1, Math.ceil(payload.total / payload.pageSize));
  if (pages <= 1) return null;

  const current = Math.min(payload.page, pages);
  const isFirst = current <= 1;
  const isLast = current >= pages;
  const visible = Array.from({ length: pages }, (_, index) => index + 1)
    .filter((page) => pages <= 7 || page === 1 || page === pages || Math.abs(page - current) <= 1);

  return (
    <nav className="pagination news-pagination reveal is-visible" id="newsPager" style={{ marginTop: 26 }} aria-label="新闻分页">
      <a
        className={`page-btn page-btn--nav${isFirst ? ' is-disabled' : ''}`}
        href={buildHref({ channel, channelRoot, keyword, page: Math.max(1, current - 1), includeChildren })}
        aria-disabled={isFirst ? 'true' : undefined}
        aria-label="上一页"
      >
        <span aria-hidden="true">‹</span>
      </a>
      {visible.map((page, index) => (
        <span key={page}>
          {index > 0 && page - visible[index - 1] > 1 ? <span style={{ opacity: .55, padding: '0 6px' }}>…</span> : null}
          <a className={`page-btn${page === current ? ' is-active' : ''}`} href={buildHref({ channel, channelRoot, keyword, page, includeChildren })}>{page}</a>
        </span>
      ))}
      <a
        className={`page-btn page-btn--nav${isLast ? ' is-disabled' : ''}`}
        href={buildHref({ channel, channelRoot, keyword, page: Math.min(pages, current + 1), includeChildren })}
        aria-disabled={isLast ? 'true' : undefined}
        aria-label="下一页"
      >
        <span aria-hidden="true">›</span>
      </a>
    </nav>
  );
}

const isNewsCenter = (channel: Channel) => channel.name === '新闻中心'
  || channel.slug === 'news-center'
  || channel.path === '/news'
  || channel.path === '/news-center';

function isWithinChannelTree(channel: Channel, root: Channel, channels: Channel[]) {
  const byId = new Map(channels.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let current: Channel | undefined = channel;
  while (current && !visited.has(current.id)) {
    if (current.id === root.id) return true;
    visited.add(current.id);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return false;
}

function buildNewsFilterRows(channels: Channel[], rootSlug: string, activeChannel: string, includeChildren: boolean, keyword: string): FilterRow[] {
  const newsChannels = channels.filter((channel) => isNewsChannel(channel, channels));
  const newsChannelIds = new Set(newsChannels.map((channel) => channel.id));
  const newsRoot = channels.find((channel) => channel.slug === rootSlug) || channels.find(isNewsCenter);
  const childrenOf = (parentId: string) => channels.filter((channel) =>
    channel.parent === parentId
    && (isNewsChannel(channel, channels) || channel.type === 'page' || channel.type === 'module' || channel.type === 'link'));
  const topChannels = newsRoot
    ? childrenOf(newsRoot.id)
    : newsChannels.filter((channel) => !channel.parent || !newsChannelIds.has(channel.parent));
  const bySlug = new Map(newsChannels.map((channel) => [channel.slug, channel]));
  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  const selected = bySlug.get(activeChannel);
  const chain: Channel[] = [];
  const visited = new Set<string>();
  let cursor = selected;
  while (cursor && cursor.id !== newsRoot?.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(cursor);
    const parentId = cursor.parent || '';
    if (!parentId) break;
    cursor = byId.get(parentId);
  }
  if (newsRoot && cursor?.id !== newsRoot.id) chain.length = 0;

  const rows: FilterRow[] = [{
    label: `${newsRoot?.name || '新闻中心'}栏目`,
    channels: topChannels.map((item) => ({ item, hasChildren: childrenOf(item.id).length > 0 })),
    activeSlug: chain[0]?.slug || '',
    channelRoot: rootSlug,
    allHref: buildHref({ keyword, channelRoot: rootSlug }),
    allActive: chain.length === 0,
  }];

  chain.forEach((parent, index) => {
    const childChannels = childrenOf(parent.id);
    if (!childChannels.length) return;
    rows.push({
      label: `${parent.name}子栏目`,
      channels: childChannels.map((item) => ({ item, hasChildren: childrenOf(item.id).length > 0 })),
      activeSlug: chain[index + 1]?.slug || '',
      channelRoot: rootSlug,
      allHref: buildHref({ channel: parent.slug, channelRoot: rootSlug, keyword, includeChildren: true }),
      allActive: activeChannel === parent.slug && includeChildren,
    });
  });

  return rows;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const rawSearchParams = await searchParams;
  const params = toSearchParams(rawSearchParams);
  const activeChannel = getFirst(rawSearchParams.channel) || 'all';
  const keyword = getFirst(rawSearchParams.keyword) || '';
  const includeChildren = getFirst(rawSearchParams.includeChildren) === 'true';
  const { channels, payload, channelRoot, sectionRoot } = await loadNews(params);
  const articleStats = await getAllArticleStats();
  const filterRows = buildNewsFilterRows(channels, channelRoot, activeChannel, includeChildren, keyword);
  const activeNavByRootSlug: Record<string, 'news' | 'businessDynamics' | 'partyMasses' | 'cleanGov' | 'responsibility'> = {
    'news-center': 'news',
    'business-news': 'businessDynamics',
    'party-mass': 'partyMasses',
    'clean-governance': 'cleanGov',
    'social-responsibility': 'responsibility',
  };
  const activeNav = sectionRoot ? activeNavByRootSlug[sectionRoot.slug] : undefined;
  const activeChannelName = filterRows
    .flatMap((row) => row.channels)
    .find(({ item }) => item.slug === activeChannel)?.item.name || sectionRoot?.name || '新闻中心';

  return (
    <>
      <NewsAssets />
      <Header active={activeNav} newsChannels={channels} />
      <Drawer active={activeNav} newsChannels={channels} />

      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/home" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>{sectionRoot?.name || '新闻中心'}</span>
            {activeChannel !== 'all' ? <>
              <span className="crumb-sep">›</span>
              <span>{activeChannelName}</span>
            </> : null}
          </div>
        </div>
      </div>

      <main className="page" aria-label="主要内容" data-news-page>
        <section className="hero">
          <div className="hero-bg">
            <img alt="" src="/img/雅砻江大桥.jpg" />
          </div>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="content hero-inner">
            <div>
              <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>NEWS CENTER</span></div>
              <h1 className="hero-title reveal is-visible">{activeChannelName}</h1>
              <p className="hero-sub reveal is-visible">浏览{sectionRoot?.name || '新闻中心'}·{activeChannelName}的相关资讯，支持搜索与分页。</p>
              <div className="hero-cta reveal is-visible">
                <a className="btn btn--primary" href="#content" data-no-transition>浏览资讯</a>
                <a className="btn" href="/contact-us">订阅与服务</a>
              </div>
            </div>
            <div className="glass reveal is-visible" aria-label="新闻速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{filterRows[0]?.channels.length || 0}</b><span>栏目分类</span></div>
                <div className="kpi"><b>{payload.total}</b><span>已发布资讯</span></div>
                <div className="kpi"><b>{payload.page}</b><span>当前页码</span></div>
                <div className="kpi"><b>公开</b><span>信息发布</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="content" aria-label="新闻内容" data-news-top>
          <div className="content">
            <div className="list-head reveal is-visible">
              <span className="list-head-label">{activeChannelName}</span>
              <span className="list-head-en">NEWS CENTER</span>
            </div>

            <div className="news-grid news-grid--list-only">
              <aside className="news-side reveal is-visible" aria-label="新闻列表">
                <div className="news-list" id="newsList">
                  {payload.items.length ? payload.items.map((item) => {
                    const publishValue = item.publishAt || item.publishDate;
                    return (
                      <a className="news-item reveal is-visible" href={`/news/${encodeURIComponent(item.id)}`} key={item.id}>
                        <span className="news-content">
                          <span className="news-headline">
                            <b className="news-title">{item.title}</b>
                            <span className="news-browse">浏览：<em>{withArticleStatBase(articleStats[item.id]).views}</em>次</span>
                          </span>
                          <span className="news-meta-row">
                            <span className="news-views">{formatDotDate(publishValue)}</span>
                          </span>
                        </span>
                      </a>
                    );
                  }) : (
                    <div className="card" style={{ padding: '24px 20px', color: 'rgba(11,18,32,.68)' }}>当前分类下暂无符合条件的新闻，请切换分类或调整关键词后重试。</div>
                  )}
                </div>
              </aside>
            </div>

            <Pager payload={payload} channel={activeChannel} channelRoot={channelRoot} keyword={keyword} includeChildren={includeChildren} />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
