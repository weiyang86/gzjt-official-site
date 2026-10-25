import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildSeoMetadata } from '@/lib/cms/seo';
import { searchSite, searchTypeLabels, type SearchResultType, type SearchTypeFilter } from '@/lib/cms/search';
import { Drawer, Footer, Header, NewsAssets } from '../news/components';

export const dynamic = 'force-dynamic';

type SearchPageProps = {
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

const buildHref = (params: { keyword: string; type: SearchTypeFilter; page?: number }) => {
  const search = new URLSearchParams();
  if (params.keyword) search.set('q', params.keyword);
  if (params.type && params.type !== 'all') search.set('type', params.type);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  const query = search.toString();
  return query ? `/search?${query}` : '/search';
};

const highlight = (text: string, keyword: string): ReactNode => {
  const source = text || '';
  const needle = keyword.trim();
  if (!needle) return source;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = source.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) => (
    part.toLowerCase() === needle.toLowerCase()
      ? <mark key={`hit-${index}`} style={{ background: 'rgba(255, 196, 0, .35)', color: 'inherit', padding: '0 2px', borderRadius: 4 }}>{part}</mark>
      : <span key={`text-${index}`}>{part}</span>
  ));
};

const typeTabs: Array<{ value: SearchTypeFilter; label: string }> = [
  { value: 'all', label: '全部' },
  ...(Object.keys(searchTypeLabels) as SearchResultType[]).map((key) => ({ value: key, label: searchTypeLabels[key] })),
];

function Pager({ keyword, type, page, pageSize, total }: {
  keyword: string;
  type: SearchTypeFilter;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const current = Math.min(page, pages);
  const visible = Array.from({ length: pages }, (_, index) => index + 1)
    .filter((item) => pages <= 7 || item === 1 || item === pages || Math.abs(item - current) <= 1);

  return (
    <nav className="pagination reveal is-visible" style={{ marginTop: 26 }} aria-label="搜索结果分页">
      <a
        className={`page-btn page-btn--nav${current <= 1 ? ' is-disabled' : ''}`}
        href={buildHref({ keyword, type, page: Math.max(1, current - 1) })}
        aria-disabled={current <= 1 ? 'true' : undefined}
      >
        <span aria-hidden="true">‹</span> 上一页
      </a>
      <span className="page-count">第 {current} / {pages} 页，共 {total} 条</span>
      {visible.map((item, index) => (
        <span key={item}>
          {index > 0 && item - visible[index - 1] > 1 ? <span style={{ opacity: .55, padding: '0 6px' }}>…</span> : null}
          <a className={`page-btn${item === current ? ' is-active' : ''}`} href={buildHref({ keyword, type, page: item })}>{item}</a>
        </span>
      ))}
      <a
        className={`page-btn page-btn--nav${current >= pages ? ' is-disabled' : ''}`}
        href={buildHref({ keyword, type, page: Math.min(pages, current + 1) })}
        aria-disabled={current >= pages ? 'true' : undefined}
      >
        下一页 <span aria-hidden="true">›</span>
      </a>
    </nav>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    path: '/search',
    title: '站内搜索',
    description: '搜索甘孜州建设投资集团有限公司网站的新闻、公告、页面、下属公司与业务板块内容。',
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawSearchParams = await searchParams;
  const payload = await searchSite(toSearchParams(rawSearchParams));
  const totalAll = Object.values(payload.counts).reduce((sum, value) => sum + value, 0);
  const hasKeyword = Boolean(payload.keyword);

  return (
    <>
      <NewsAssets />
      <Header />
      <Drawer />

      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/home" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>站内搜索</span>
          </div>
        </div>
      </div>

      <main className="page" aria-label="站内搜索" data-news-page>
        <section className="hero">
          <div className="hero-bg"><img alt="" src="/img/雅砻江大桥.jpg" /></div>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="content hero-inner">
            <div>
              <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>SITE SEARCH</span></div>
              <h1 className="hero-title reveal is-visible">站内搜索</h1>
              <p className="hero-sub reveal is-visible">覆盖新闻、公告、页面、下属公司与业务板块，一次检索全站已发布内容。</p>
            </div>
            <div className="glass reveal is-visible" aria-label="搜索结果速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{totalAll}</b><span>匹配内容</span></div>
                <div className="kpi"><b>{payload.counts.news + payload.counts.notice}</b><span>新闻公告</span></div>
                <div className="kpi"><b>{payload.counts.page}</b><span>相关页面</span></div>
                <div className="kpi"><b>{payload.counts.company + payload.counts.sector}</b><span>业务内容</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="content" aria-label="搜索结果">
          <div className="content">
            <div className="filters reveal is-visible">
              <form className="search" aria-label="站内搜索" action="/search" role="search">
                <input className="input" name="q" defaultValue={payload.keyword} placeholder="输入关键词搜索全站内容" aria-label="搜索关键词" />
                {payload.type !== 'all' ? <input type="hidden" name="type" value={payload.type} /> : null}
                <button className="btn btn--primary" type="submit">搜索</button>
              </form>
            </div>

            <div className="tabs" role="tablist" aria-label="搜索结果类型" style={{ marginTop: 18 }}>
              {typeTabs.map((tab) => {
                const count = tab.value === 'all' ? totalAll : payload.counts[tab.value];
                return (
                  <a
                    className={`tab${payload.type === tab.value ? ' is-active' : ''}`}
                    href={buildHref({ keyword: payload.keyword, type: tab.value })}
                    key={tab.value}
                    aria-current={payload.type === tab.value ? 'page' : undefined}
                  >
                    {tab.label}（{count}）
                  </a>
                );
              })}
            </div>

            {payload.errors.length ? (
              <p className="lead" style={{ marginTop: 18 }}>{payload.errors.join('、')}数据暂时无法加载，其余结果仍可正常查看。</p>
            ) : null}

            {!hasKeyword ? (
              <div className="card" style={{ padding: '24px 20px', color: 'rgba(11,18,32,.68)', marginTop: 24 }}>
                请输入关键词后开始搜索，可检索新闻标题、公告内容、集团页面、下属公司与业务板块信息。
              </div>
            ) : payload.items.length ? (
              <div className="news-grid news-grid--list-only" style={{ marginTop: 24 }}>
                <aside className="news-side reveal is-visible" aria-label="搜索结果列表">
                  <div className="news-list">
                    {payload.items.map((item) => (
                      <a className="news-item reveal is-visible" href={item.url} key={`${item.type}-${item.id}`}>
                        <span className="thumb"><img src={item.cover || '/img/雅砻江大桥.jpg'} alt="" /></span>
                        <span className="news-content">
                          <b className="news-title">{highlight(item.title, payload.keyword)}</b>
                          <span className="news-desc">{highlight(item.summary || '查看详情。', payload.keyword)}</span>
                          <span className="news-meta-row">
                            <span className="news-cat-tag">{item.typeLabel}{item.category && item.category !== item.typeLabel ? ` · ${item.category}` : ''}</span>
                            {item.date ? <span className="news-views">{formatDate(item.date)}</span> : null}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </aside>
              </div>
            ) : (
              <div className="card" style={{ padding: '24px 20px', color: 'rgba(11,18,32,.68)', marginTop: 24 }}>
                未找到与“{payload.keyword}”匹配的内容，请尝试更换关键词或切换内容类型。
              </div>
            )}

            <Pager keyword={payload.keyword} type={payload.type} page={payload.page} pageSize={payload.pageSize} total={payload.total} />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
