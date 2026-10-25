import type { PageContent, ResponsibilityCategory, ResponsibilityContent, ResponsibilityItem } from '@/types/cms';
import { Drawer, Footer, Header, NewsAssets } from '../news/components';

const fallbackCover = '/img/海螺沟路基建成后2.jpg';

const categoryMeta: Record<ResponsibilityCategory, { label: string; description: string }> = {
  report: { label: '责任报告', description: '发布 ESG/CSR 年度报告与专项报告，支持原文附件下载。' },
  case: { label: '实践案例', description: '记录集团在乡村振兴、绿色建设、民生保障等方面的具体实践。' },
  activity: { label: '公益活动', description: '汇集志愿服务、抢险救灾、帮扶慰问等公益行动。' },
};

const categoryOrder: ResponsibilityCategory[] = ['report', 'case', 'activity'];

const formatSize = (size?: number) => {
  if (!size || size <= 0) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const attachmentHref = (attachment: { id: string }) => {
  const value = (attachment.id || '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/public/cms/assets/')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return `/api/public/cms/assets/${encodeURIComponent(value)}`;
};

const safeLinkHref = (value?: string) => {
  const url = (value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '';
};

const categoryHref = (basePath: string, category: 'all' | ResponsibilityCategory) => (
  category === 'all' ? basePath : `${basePath}?category=${category}`
);

function Breadcrumb() {
  return (
    <div className="breadcrumb" aria-label="面包屑导航">
      <div className="content">
        <div className="crumb-inner">
          <a href="/" data-no-transition>首页</a>
          <span className="crumb-sep">›</span>
          <span>社会责任</span>
        </div>
      </div>
    </div>
  );
}

function ResponsibilityHero({ title, subtitle, cover, counts }: {
  title: string;
  subtitle: string;
  cover?: string;
  counts: Record<ResponsibilityCategory, number> & { attachments: number };
}) {
  return (
    <section className="hero" aria-label="社会责任">
      <div className="hero-bg"><img alt="" src={cover || fallbackCover} /></div>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-noise" aria-hidden="true" />
      <div className="content hero-inner">
        <div>
          <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>ESG / CSR</span></div>
          <h1 className="hero-title reveal is-visible">{title}</h1>
          <p className="hero-sub reveal is-visible">{subtitle}</p>
          <div className="hero-cta reveal is-visible">
            <a className="btn btn--primary" href="#actions" data-no-transition>责任行动</a>
            <a className="btn" href="#content" data-no-transition>责任体系</a>
          </div>
        </div>
        <div className="glass reveal is-visible" aria-label="责任内容概览">
          <div className="kpi-grid">
            <div className="kpi"><b>{counts.report}</b><span>责任报告</span></div>
            <div className="kpi"><b>{counts.case}</b><span>实践案例</span></div>
            <div className="kpi"><b>{counts.activity}</b><span>公益活动</span></div>
            <div className="kpi"><b>{counts.attachments}</b><span>可下载附件</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AttachmentList({ items }: { items: ResponsibilityItem['attachments'] }) {
  if (!items.length) return null;
  return (
    <div className="attachments" style={{ marginTop: 14 }}>
      {items.map((attachment) => (
        <div className="attach" key={`${attachment.id}-${attachment.name}`}>
          <span>
            <b>{attachment.name}</b>
            {attachment.size ? <><br /><small>{formatSize(attachment.size)}</small></> : null}
          </span>
          <a className="btn" href={attachmentHref(attachment)} download={attachment.name} target="_blank" rel="noreferrer">
            下载
          </a>
        </div>
      ))}
    </div>
  );
}

function ReportCard({ item }: { item: ResponsibilityItem }) {
  const linkHref = safeLinkHref(item.linkUrl);
  return (
    <article className="card reveal is-visible" style={{ gridColumn: 'span 6' }}>
      <div className="card-pad">
        <div className="pill">{item.year || '责任报告'}</div>
        <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18, lineHeight: 1.4 }}>{item.title}</div>
        {item.summary ? <p className="rich" style={{ marginTop: 8 }}>{item.summary}</p> : null}
        {item.content ? (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', color: '#0d4f89', fontWeight: 700 }}>查看报告说明</summary>
            <div className="body rich" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: item.content }} />
          </details>
        ) : null}
        <AttachmentList items={item.attachments} />
        {!item.attachments.length && linkHref ? (
          <p style={{ marginTop: 14 }}>
            <a className="btn btn--primary" href={linkHref} target="_blank" rel="noreferrer">查看报告原文</a>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ActivityCard({ item }: { item: ResponsibilityItem }) {
  const meta = categoryMeta[item.category];
  const linkHref = safeLinkHref(item.linkUrl);
  return (
    <article className="card reveal is-visible" style={{ gridColumn: 'span 4' }}>
      {item.image ? <div style={{ height: 180, overflow: 'hidden' }}><img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div> : null}
      <div className="card-pad">
        <div className="pill">{item.year ? `${meta.label} · ${item.year}` : meta.label}</div>
        <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 17, lineHeight: 1.4 }}>{item.title}</div>
        {item.summary ? <div className="rich" style={{ marginTop: 8 }}>{item.summary}</div> : null}
        {item.content ? (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', color: '#0d4f89', fontWeight: 700 }}>查看详情</summary>
            <div className="body rich" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: item.content }} />
          </details>
        ) : null}
        <AttachmentList items={item.attachments} />
        {!item.attachments.length && linkHref ? (
          <p style={{ marginTop: 12 }}>
            <a className="btn" href={linkHref} target="_blank" rel="noreferrer">查看相关链接</a>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function CategorySection({ category, items }: { category: ResponsibilityCategory; items: ResponsibilityItem[] }) {
  const meta = categoryMeta[category];
  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-head reveal is-visible">
        <div>
          <div className="kicker"><i aria-hidden="true" /><span>{category.toUpperCase()}</span></div>
          <div className="h2" style={{ fontSize: 26 }}>{meta.label}</div>
          <p className="lead">{meta.description}</p>
        </div>
        <span className="meta">共 {items.length} 条</span>
      </div>
      {items.length ? (
        category === 'report' ? (
          <div className="grid" style={{ marginTop: 18 }}>
            {items.map((item) => <ReportCard item={item} key={item.id} />)}
          </div>
        ) : (
          <div className="grid" style={{ marginTop: 18 }}>
            {items.map((item) => <ActivityCard item={item} key={item.id} />)}
          </div>
        )
      ) : (
        <div className="detail reveal is-visible">
          <div className="body"><p>暂无{meta.label}内容，请稍后查看。</p></div>
        </div>
      )}
    </div>
  );
}

export function ResponsibilityPage({
  basePath,
  fallbackPage,
  content,
  items,
  activeCategory,
}: {
  basePath: string;
  fallbackPage: PageContent | null;
  content: ResponsibilityContent | null;
  items: ResponsibilityItem[];
  activeCategory: 'all' | ResponsibilityCategory;
}) {
  const title = content?.title || fallbackPage?.title || '社会责任';
  const subtitle = content?.subtitle
    || '聚焦乡村振兴、公益活动、环保建设与社会贡献，形成可量化、可持续的责任体系与成果展示。';
  const cover = content?.cover || fallbackPage?.cover || fallbackCover;
  const body = content?.content || fallbackPage?.content || '<p>暂无内容。</p>';

  const counts = {
    report: items.filter((item) => item.category === 'report').length,
    case: items.filter((item) => item.category === 'case').length,
    activity: items.filter((item) => item.category === 'activity').length,
    attachments: items.reduce((total, item) => total + item.attachments.length, 0),
  };

  const visibleCategories = activeCategory === 'all'
    ? categoryOrder.filter((category) => items.some((item) => item.category === category))
    : [activeCategory];

  return (
    <>
      <NewsAssets />
      <Header active="responsibility" />
      <Drawer active="responsibility" />
      <Breadcrumb />
      <main className="page" aria-label="主要内容">
        <ResponsibilityHero title={title} subtitle={subtitle} cover={cover} counts={counts} />

        <section className="section" id="content" aria-label="责任体系">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>RESPONSIBILITY SYSTEM</span></div>
                <div className="h2">{title}</div>
              </div>
            </div>
            <div className="detail reveal is-visible">
              <div className="body" dangerouslySetInnerHTML={{ __html: body }} />
            </div>
          </div>
        </section>

        <section className="section" id="actions" aria-label="责任报告、实践案例与公益活动">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>ACTIONS &amp; REPORTS</span></div>
                <div className="h2">责任行动与成果</div>
                <p className="lead">按责任报告、实践案例、公益活动分类展示，报告类内容支持附件下载。</p>
              </div>
            </div>
            <div className="filters reveal is-visible" style={{ justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className={`btn${activeCategory === 'all' ? ' btn--primary' : ''}`} href={categoryHref(basePath, 'all')} data-no-transition>
                  全部（{items.length}）
                </a>
                {categoryOrder.map((category) => (
                  <a
                    className={`btn${activeCategory === category ? ' btn--primary' : ''}`}
                    href={categoryHref(basePath, category)}
                    key={category}
                    data-no-transition
                  >
                    {categoryMeta[category].label}（{counts[category]}）
                  </a>
                ))}
              </div>
            </div>
            {items.length ? (
              visibleCategories.map((category) => (
                <CategorySection
                  category={category}
                  items={items.filter((item) => item.category === category)}
                  key={category}
                />
              ))
            ) : (
              <div className="detail reveal is-visible" style={{ marginTop: 18 }}>
                <div className="body"><p>暂无责任内容，请稍后查看。</p></div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
