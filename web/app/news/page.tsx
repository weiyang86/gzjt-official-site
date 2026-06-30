import { fallbackNewsChannels, getFallbackNewsPayload } from '@/lib/cms/fallback-news';
import { getPublicArticles, getPublicChannels } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from './components';
import type { Article, Channel, PublicArticleListPayload } from '@/types/cms';

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

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const dayText = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return String(date.getDate()).padStart(2, '0');
};

const monthText = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
};

const buildHref = (params: { channel?: string; keyword?: string; page?: number }) => {
  const search = new URLSearchParams();
  if (params.channel && params.channel !== 'all') search.set('channel', params.channel);
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  const query = search.toString();
  return query ? `/news?${query}` : '/news';
};

const getChannelLabel = (item: Article) => {
  const channel = item.mainChannel || item.main_channel;
  return item.newsSubcategory ? `${channel?.name || '新闻中心'} · ${item.newsSubcategory}` : channel?.name || '新闻中心';
};

async function loadNews(searchParams: URLSearchParams) {
  const withScope = new URLSearchParams(searchParams);
  withScope.set('scope', 'news');
  withScope.set('pageSize', withScope.get('pageSize') || '8');
  const channel = withScope.get('channel') || 'all';
  if (channel !== 'all') withScope.set('channelSlug', channel);

  try {
    const [channels, payload] = await Promise.all([
      getPublicChannels('news'),
      getPublicArticles(withScope),
    ]);
    return {
      channels: channels.length ? channels : fallbackNewsChannels.filter((item) => item.type === 'news' || item.isNewsCategory),
      payload,
      isFallback: false,
    };
  } catch {
    return {
      channels: fallbackNewsChannels.filter((item) => item.type === 'news' || item.isNewsCategory),
      payload: getFallbackNewsPayload(withScope),
      isFallback: true,
    };
  }
}

function Tabs({ channels, active, keyword }: { channels: Channel[]; active: string; keyword: string }) {
  return (
    <div className="tabs" role="tablist" aria-label="新闻分类">
      <a className={`tab${active === 'all' ? ' is-active' : ''}`} href={buildHref({ keyword })}>全部</a>
      {channels.map((channel) => (
        <a
          className={`tab${active === channel.slug ? ' is-active' : ''}`}
          href={buildHref({ channel: channel.slug, keyword })}
          key={channel.slug}
        >
          {channel.name}
        </a>
      ))}
    </div>
  );
}

function Pager({ payload, channel, keyword }: { payload: PublicArticleListPayload; channel: string; keyword: string }) {
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
        href={buildHref({ channel, keyword, page: Math.max(1, current - 1) })}
        aria-disabled={isFirst ? 'true' : undefined}
      >
        <span aria-hidden="true">‹</span> 上一页
      </a>
      <span className="page-count">第 {current} / {pages} 页</span>
      {visible.map((page, index) => (
        <span key={page}>
          {index > 0 && page - visible[index - 1] > 1 ? <span style={{ opacity: .55, padding: '0 6px' }}>…</span> : null}
          <a className={`page-btn${page === current ? ' is-active' : ''}`} href={buildHref({ channel, keyword, page })}>{page}</a>
        </span>
      ))}
      <a
        className={`page-btn page-btn--nav${isLast ? ' is-disabled' : ''}`}
        href={buildHref({ channel, keyword, page: Math.min(pages, current + 1) })}
        aria-disabled={isLast ? 'true' : undefined}
      >
        下一页 <span aria-hidden="true">›</span>
      </a>
    </nav>
  );
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const rawSearchParams = await searchParams;
  const params = toSearchParams(rawSearchParams);
  const activeChannel = getFirst(rawSearchParams.channel) || 'all';
  const keyword = getFirst(rawSearchParams.keyword) || '';
  const { channels, payload } = await loadNews(params);

  return (
    <>
      <NewsAssets />
      <Header active="news" newsChannels={channels} />
      <Drawer active="news" newsChannels={channels} />

      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>新闻中心</span>
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
              <h1 className="hero-title reveal is-visible">新闻中心</h1>
              <p className="hero-sub reveal is-visible">聚合集团新闻、行业动态、通知公告、媒体聚焦，支持分类浏览、搜索与分页。</p>
              <div className="hero-cta reveal is-visible">
                <a className="btn btn--primary" href="#content" data-no-transition>浏览资讯</a>
                <a className="btn" href="/contact-us">订阅与服务</a>
              </div>
            </div>
            <div className="glass reveal is-visible" aria-label="新闻速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{channels.length}</b><span>新闻分类</span></div>
                <div className="kpi"><b>{payload.total}</b><span>已发布资讯</span></div>
                <div className="kpi"><b>{payload.page}</b><span>当前页码</span></div>
                <div className="kpi"><b>公开</b><span>信息发布</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="content" aria-label="新闻内容" data-news-top>
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>UPDATES</span></div>
                <div className="h2">资讯聚合</div>
                <p className="lead">按分类浏览或输入关键词搜索，列表支持分页展示。</p>
              </div>
            </div>

            <div className="filters news-filter-tabs reveal is-visible">
              <Tabs channels={channels} active={activeChannel} keyword={keyword} />
            </div>

            <div className="news-grid news-grid--list-only" style={{ marginTop: 26 }}>
              <aside className="news-side reveal is-visible" aria-label="新闻列表">
                <div className="news-list" id="newsList">
                  {payload.items.length ? payload.items.map((item) => {
                    const publishValue = item.publishAt || item.publishDate;
                    return (
                      <a className="news-item reveal is-visible" href={`/news/${encodeURIComponent(item.id)}`} key={item.id}>
                        <span className="news-date-tag">
                          <span className="nd-day">{dayText(publishValue)}</span>
                          <span className="nd-month">{monthText(publishValue)}</span>
                        </span>
                        <span className="thumb"><img src={item.cover || '/img/雅砻江大桥.jpg'} alt="" /></span>
                        <span className="news-content">
                          <b className="news-title">{item.title}</b>
                          <span className="news-desc">{item.summary || '查看该资讯详情。'}</span>
                          <span className="news-meta-row">
                            <span className="news-cat-tag">{getChannelLabel(item)}</span>
                            <span className="news-views">{formatDate(publishValue)}</span>
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

            <Pager payload={payload} channel={activeChannel} keyword={keyword} />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
