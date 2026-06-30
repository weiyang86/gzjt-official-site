import { getPublicArticles, getPublicChannels } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from '../news/components';
import type { Channel, PublicArticleListPayload } from '@/types/cms';

export const dynamic = 'force-dynamic';

type DisclosurePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const toSearchParams = (source: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(source).forEach(([key, value]) => {
    const first = getFirst(value);
    if (first) params.set(key, first);
  });
  return params;
};

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
  return query ? `/disclosure?${query}` : '/disclosure';
};

const getEmptyNoticePayload = (searchParams: URLSearchParams): PublicArticleListPayload => {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '8', 10) || 8));
  return { page, pageSize, total: 0, items: [] };
};

async function loadNotices(searchParams: URLSearchParams) {
  const withScope = new URLSearchParams(searchParams);
  withScope.set('scope', 'notice');
  withScope.set('pageSize', withScope.get('pageSize') || '8');
  const channel = withScope.get('channel') || 'all';
  if (channel !== 'all') withScope.set('channelSlug', channel);

  try {
    const [channels, payload] = await Promise.all([
      getPublicChannels('notice'),
      getPublicArticles(withScope),
    ]);
    return {
      channels,
      payload,
      error: '',
    };
  } catch (error) {
    return {
      channels: [],
      payload: getEmptyNoticePayload(withScope),
      error: error instanceof Error ? error.message : '公示公告数据加载失败',
    };
  }
}

function Tabs({ channels, active, keyword }: { channels: Channel[]; active: string; keyword: string }) {
  return (
    <div className="tabs" role="tablist" aria-label="公告分类">
      <a className={`tab${active === 'all' ? ' is-active' : ''}`} href={buildHref({ keyword })}>全部</a>
      {channels.map((channel) => (
        <a className={`tab${active === channel.slug ? ' is-active' : ''}`} href={buildHref({ channel: channel.slug, keyword })} key={channel.slug}>
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
    <nav className="pagination disclosure-pagination reveal is-visible" style={{ marginTop: 26 }} aria-label="公告分页">
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
          {index > 0 && page - visible[index - 1] > 1 ? <span style={{ opacity: .55, padding: '0 6px' }}>...</span> : null}
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

export default async function DisclosurePage({ searchParams }: DisclosurePageProps) {
  const rawSearchParams = await searchParams;
  const params = toSearchParams(rawSearchParams);
  const activeChannel = getFirst(rawSearchParams.channel) || 'all';
  const keyword = getFirst(rawSearchParams.keyword) || '';
  const { channels, payload, error } = await loadNotices(params);
  const selectedChannel = activeChannel !== 'all' ? channels.find((channel) => channel.slug === activeChannel) : null;
  const activeCategoryName = selectedChannel?.name || '公示公告';

  return (
    <>
      <NewsAssets />
      <Header active="disclosure" noticeChannels={channels} />
      <Drawer active="disclosure" noticeChannels={channels} />

      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>{activeCategoryName}</span>
          </div>
        </div>
      </div>

      <main className="page" aria-label="主要内容" data-news-page data-disclosure-page>
        <section className="hero">
          <div className="hero-bg"><img alt="" src="/img/雅砻江大桥.jpg" /></div>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="content hero-inner">
            <div>
              <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>DISCLOSURE</span></div>
              <h1 className="hero-title reveal is-visible">公示公告</h1>
              <p className="hero-sub reveal is-visible">集中发布集团公告、公示、采购招采等公开信息，支持分类浏览、搜索与分页。</p>
              <div className="hero-cta reveal is-visible">
                <a className="btn btn--primary" href="#content" data-no-transition>浏览公告</a>
                <a className="btn" href="/contact-us">咨询服务</a>
              </div>
            </div>
            <div className="glass reveal is-visible" aria-label="公告速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{channels.length}</b><span>公告分类</span></div>
                <div className="kpi"><b>{payload.total}</b><span>已发布公告</span></div>
                <div className="kpi"><b>{payload.page}</b><span>当前页</span></div>
                <div className="kpi"><b>公开</b><span>信息类型</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="content" aria-label="公告内容" data-news-top>
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>ANNOUNCEMENTS</span></div>
                <div className="h2">{activeCategoryName}</div>
                {error ? <p className="lead">公告数据暂时无法加载，请稍后重试。</p> : null}
              </div>
            </div>

            <div className="filters reveal is-visible">
              <Tabs channels={channels} active={activeChannel} keyword={keyword} />
              <form className="search" aria-label="搜索" action="/disclosure">
                {activeChannel !== 'all' ? <input type="hidden" name="channel" value={activeChannel} /> : null}
                <input className="input" name="keyword" defaultValue={keyword} placeholder="搜索公告标题 / 摘要" />
                <button className="btn" type="submit">搜索</button>
              </form>
            </div>

            <div className="news-grid news-grid--list-only" style={{ marginTop: 30 }}>
              <aside className="news-side reveal is-visible" aria-label={`${activeCategoryName}列表`}>
                <div className="news-list">
                  {payload.items.length ? payload.items.map((item, index) => {
                    const publishValue = item.publishAt || item.publishDate;
                    const channel = item.mainChannel || item.main_channel;
                    const isFeatured = index === 0;
                    if (isFeatured) {
                      return (
                        <a className="news-item reveal is-visible news-item--featured" href={`/news/${encodeURIComponent(item.id)}`} key={item.id}>
                          <span className="thumb thumb--featured"><img src={item.cover || '/img/雅砻江大桥.jpg'} alt="" /></span>
                          <span className="news-content">
                            <span className="news-featured-top">
                              <span className="news-cat-tag">{channel?.name || '公示公告'}</span>
                              <span className="news-featured-date">{formatDate(publishValue)}</span>
                            </span>
                            <b className="news-title">{item.title}</b>
                            <span className="news-desc">{item.summary || '查看公告详情。'}</span>
                            <span className="news-meta-row">
                              <span className="news-date-tag news-date-tag--featured">
                                <span className="nd-day">{dayText(publishValue)}</span>
                                <span className="nd-month">{monthText(publishValue)}</span>
                              </span>
                              <span className="news-featured-hint">点击查看公告详情</span>
                            </span>
                          </span>
                        </a>
                      );
                    }
                    return (
                      <a className="news-item reveal is-visible" href={`/news/${encodeURIComponent(item.id)}`} key={item.id}>
                        <span className="news-date-tag">
                          <span className="nd-day">{dayText(publishValue)}</span>
                          <span className="nd-month">{monthText(publishValue)}</span>
                        </span>
                        <span className="thumb"><img src={item.cover || '/img/雅砻江大桥.jpg'} alt="" /></span>
                        <span className="news-content">
                          <b className="news-title">{item.title}</b>
                          <span className="news-desc">{item.summary || '查看公告详情。'}</span>
                          <span className="news-meta-row">
                            <span className="news-cat-tag">{channel?.name || '公示公告'}</span>
                            <span className="news-views">{formatDate(publishValue)}</span>
                          </span>
                        </span>
                      </a>
                    );
                  }) : (
                    <div className="card" style={{ padding: '24px 20px', color: 'rgba(11,18,32,.68)' }}>当前分类下暂无符合条件的公告，请切换分类或调整关键词后重试。</div>
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
