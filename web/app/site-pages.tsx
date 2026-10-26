import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { Drawer, Footer, Header, NewsAssets, type NavKey } from './news/components';
import {
  getPublicArticles,
  getPublicBusinessSectors,
  getPublicChannels,
  getPublicCompanies,
  getPublicCompanyBySlug,
  getPublicContactInfo,
  getPublicGroupIntro,
  getPublicHistoryTimeline,
  getPublicHonors,
  getPublicLeaders,
  getPublicPageBySlug,
  getPublicReportArticles,
  getPublicReportConfig,
} from '@/lib/cms';
import { getGroupIntroConfig, type GroupIntroAchievement, type GroupIntroConfig, type GroupIntroStat } from '@/lib/cms/group-intro';
import {
  fallbackBusinessSectors,
  fallbackCompanies,
  fallbackCompanyBySlug,
  fallbackHistoryTimeline,
  fallbackPageBySlug,
} from '@/lib/cms/fallback-site';
import type { Article, BusinessSector, Channel, Company, HistoryTimelineItem, HonorItem, PageContent } from '@/types/cms';
import type { ReportConfig } from '@/lib/report/config';
import { LeadershipPortrait } from '@/app/group/leadership/LeadershipPortrait';

type ActiveKey = NavKey;
type HeroStat = { value: string; label: string };

const pageMeta: Record<string, { title: string; kicker: string; active: ActiveKey; subtitle: string; cta?: string }> = {
  about: {
    title: '集团概况',
    kicker: 'ABOUT GANZI GROUP',
    active: 'about',
    subtitle: '聚焦交通和城乡基础设施项目投融资、建设、开发与资产经营，持续夯实雪域高原现代化建设底盘。',
    cta: '查看下属公司',
  },
  projects: {
    title: '项目展示',
    kicker: 'PROJECTS',
    active: 'businessDev',
    subtitle: '集中呈现集团重点交通、城乡基础设施、产业与文旅项目。',
    cta: '查看项目地图',
  },
  party: {
    title: '党建群团',
    kicker: 'PARTY AND MASSES',
    active: 'partyMasses',
    subtitle: '坚持党建引领，凝聚奋进力量，推动企业高质量发展。',
    cta: '查看重点板块',
  },
  businessDynamics: {
    title: '业务动态',
    kicker: 'BUSINESS UPDATES',
    active: 'businessDynamics',
    subtitle: '聚焦重点项目推进、经营管理、工程服务与区域协同，展示业务一线动态。',
    cta: '查看动态',
  },
  cleanGov: {
    title: '廉洁建投',
    kicker: 'CLEAN GOVERNANCE',
    active: 'cleanGov',
    subtitle: '建设清廉国企，强化纪律监督、廉洁教育和风险防控，护航集团高质量发展。',
    cta: '查看内容',
  },
  responsibility: {
    title: '社会责任',
    kicker: 'SOCIAL RESPONSIBILITY',
    active: 'responsibility',
    subtitle: '聚焦乡村振兴、公益活动、环保建设与社会贡献。',
    cta: '查看责任行动',
  },
  contact: {
    title: '联系我们',
    kicker: 'CONTACT',
    active: 'contact',
    subtitle: '欢迎通过业务咨询、合作对接等方式与我们取得联系。',
    cta: '联系信息',
  },
};

const fallbackCover = '/img/雅砻江大桥.jpg';

const defaultHeroStats: HeroStat[] = [
  { value: '公开', label: '信息发布' },
  { value: '协同', label: '业务联动' },
  { value: '规范', label: '运营管理' },
  { value: '服务', label: '发展大局' },
];

const historyPlaceholderPattern = /示例|测试|示意|占位|待完善|待替换/i;
const visibleHistoryTimeline = (items: HistoryTimelineItem[]) => items
  .filter((item) => item.title && !historyPlaceholderPattern.test(`${item.year} ${item.title}`));

const placeholderTextPattern = /测试|示例|示意|后续|可编辑详情入口|用于本地|待替换|待完善|Directus|CMS|Next|Trae/i;
const stripDecoratedTitle = (value?: string) => (value || '').split('｜')[0].replace(/（示意）/g, '').trim();
const isPlaceholderText = (value?: string | null) => Boolean(value && placeholderTextPattern.test(value));
const companyDisplayName = (company: Company) => {
  const name = stripDecoratedTitle(company.name);
  if (name && !isPlaceholderText(name)) return name;
  const shortName = stripDecoratedTitle(company.shortName);
  if (shortName && !isPlaceholderText(shortName)) return `${shortName}公司`;
  return '下属公司';
};
const companyDisplayLabel = (company: Company) => {
  const shortName = stripDecoratedTitle(company.shortName);
  return shortName && !isPlaceholderText(shortName) ? shortName : '下属公司';
};
const companyDisplayIntro = (company: Company) => {
  const text = company.intro || company.description || '';
  if (text && !isPlaceholderText(text)) return text;
  return '承担集团相关业务职责，服务重点项目建设、运营管理与区域协同发展。';
};

const sanitizePageContent = (page: PageContent | null, slug: string) => {
  if (!page) return fallbackPageBySlug(slug);
  if (isPlaceholderText(page.content)) {
    const fallback = fallbackPageBySlug(slug);
    return fallback ? { ...page, content: fallback.content } : { ...page, content: '' };
  }
  return page;
};

async function loadPage(slug: string): Promise<PageContent | null> {
  try {
    return sanitizePageContent(await getPublicPageBySlug(slug), slug);
  } catch {
    return fallbackPageBySlug(slug);
  }
}

async function loadCompanies() {
  try {
    const companies = await getPublicCompanies();
    return companies.length ? companies : fallbackCompanies;
  } catch {
    return fallbackCompanies;
  }
}

async function loadBusinessSectors() {
  try {
    return await getPublicBusinessSectors();
  } catch {
    return fallbackBusinessSectors;
  }
}

async function loadCompany(slug: string) {
  try {
    return await getPublicCompanyBySlug(slug) || fallbackCompanyBySlug(slug);
  } catch {
    return fallbackCompanyBySlug(slug);
  }
}

function Hero({ title, kicker, subtitle, cover, ctaHref = '#content', ctaLabel = '查看内容', stats = defaultHeroStats }: {
  title: string;
  kicker: string;
  subtitle: string;
  cover?: string;
  ctaHref?: string;
  ctaLabel?: string;
  stats?: HeroStat[];
}) {
  return (
    <section className="hero">
      <div className="hero-bg"><img alt="" src={cover || fallbackCover} /></div>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-noise" aria-hidden="true" />
      <div className="content hero-inner">
        <div>
          <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>{kicker}</span></div>
          <h1 className="hero-title reveal is-visible">{title}</h1>
          <p className="hero-sub reveal is-visible">{subtitle}</p>
          <div className="hero-cta reveal is-visible">
            <a className="btn btn--primary" href={ctaHref} data-no-transition>{ctaLabel}</a>
            <a className="btn" href="/contact-us">联系我们</a>
          </div>
        </div>
        {stats.length ? <div className="glass reveal is-visible" aria-label="页面速览">
          <div className="kpi-grid">
            {stats.map((item) => (
              <div className="kpi" key={`${item.value}-${item.label}`}><b>{item.value}</b><span>{item.label}</span></div>
            ))}
          </div>
        </div> : null}
      </div>
    </section>
  );
}

function Shell({ active, children, actionHref = 'https://gjy.gzjtjt.cn/', actionLabel = '甘建云' }: {
  active: ActiveKey;
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <>
      <NewsAssets />
      <Header active={active} actionHref={actionHref} actionLabel={actionLabel} />
      <Drawer active={active} />
      {children}
      <Footer />
    </>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return (
    <div className="breadcrumb" aria-label="面包屑导航">
      <div className="content">
        <div className="crumb-inner">
          <a href="/home" data-no-transition>首页</a>
          <span className="crumb-sep">›</span>
          <span>{title}</span>
        </div>
      </div>
    </div>
  );
}

function ContentSection({ page }: { page: PageContent }) {
  return (
    <section className="section" id="content" aria-label={`${page.title}内容`}>
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>CONTENT</span></div>
            <div className="h2">{page.title}</div>
          </div>
        </div>
        <div className="detail reveal is-visible">
          <div className="body" dangerouslySetInnerHTML={{ __html: page.content || '<p>暂无内容。</p>' }} />
        </div>
      </div>
    </section>
  );
}

function ContactInfoSection({ contactInfo }: { contactInfo: Awaited<ReturnType<typeof getPublicContactInfo>> }) {
  return (
    <section className="section" id="contact-info" aria-label="联系信息">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>CONTACT INFORMATION</span></div>
            <div className="h2">联系信息</div>
          </div>
        </div>
        <div className="grid">
          <article className="card reveal is-visible" style={{ gridColumn: 'span 4' }}><div className="card-pad"><div className="pill">联系地址</div><p>{contactInfo.address}</p></div></article>
          <article className="card reveal is-visible" style={{ gridColumn: 'span 4' }}><div className="card-pad"><div className="pill">联系电话</div><p><a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a></p></div></article>
          {contactInfo.email ? <article className="card reveal is-visible" style={{ gridColumn: 'span 4' }}><div className="card-pad"><div className="pill">联系邮箱</div><p><a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p></div></article> : null}
        </div>
      </div>
    </section>
  );
}

function ReportEntrySection({ config }: { config: ReportConfig }) {
  const onlineUrl = /^https?:\/\//i.test(config.onlineUrl) ? config.onlineUrl : '';
  const entries: Array<{ label: string; node: ReactNode }> = [];
  if (config.phone) entries.push({ label: '举报电话', node: <a href={`tel:${config.phone}`}>{config.phone}</a> });
  if (config.email) entries.push({ label: '举报邮箱', node: <a href={`mailto:${config.email}`}>{config.email}</a> });
  if (config.address) entries.push({ label: '来信来访', node: <span>{config.address}</span> });
  if (onlineUrl) entries.push({ label: '在线举报', node: <a href={onlineUrl} target="_blank" rel="noopener noreferrer">{config.onlineLabel || '前往在线举报'}</a> });
  const span = entries.length >= 4 ? 3 : entries.length === 3 ? 4 : entries.length === 2 ? 6 : 12;

  return (
    <section className="section" id="report-entry" aria-label="举报入口">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>REPORT ENTRY</span></div>
            <div className="h2">{config.title || '举报入口'}</div>
            {config.intro ? <p className="lead">{config.intro}</p> : null}
          </div>
        </div>
        {entries.length ? (
          <div className="grid">
            {entries.map((entry) => (
              <article className="card reveal is-visible" key={entry.label} style={{ gridColumn: `span ${span}` }}>
                <div className="card-pad"><div className="pill">{entry.label}</div>{entry.node}</div>
              </article>
            ))}
          </div>
        ) : <p className="lead">举报入口联系方式暂未发布，可在后台“举报入口设置”中补充电话、邮箱、来信来访地址或在线举报链接。</p>}
        {config.notice ? (
          <div className="detail reveal is-visible" style={{ marginTop: 24 }}>
            <div className="body" style={{ whiteSpace: 'pre-line' }}>{config.notice}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DisciplineNewsSection({ articles, channelSlug }: { articles: Article[]; channelSlug: string }) {
  const dayText = (value?: string) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '--';
    return String(date.getDate()).padStart(2, '0');
  };
  const monthText = (value?: string) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return `${date.getMonth() + 1}月`;
  };

  return (
    <section className="section" id="discipline-news" aria-label="纪检监察动态">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>DISCIPLINE INSPECTION</span></div>
            <div className="h2">纪检监察动态</div>
            <p className="lead">发布集团纪检监察、廉洁教育相关动态与通知。</p>
          </div>
          {channelSlug ? <a className="btn" href={`/news?channel=${encodeURIComponent(channelSlug)}`} data-no-transition>查看全部</a> : null}
        </div>
        {articles.length ? (
          <div className="news-list">
            {articles.map((article) => {
              const publishValue = article.publishAt || article.publishDate;
              return (
                <a className="news-item reveal is-visible" href={`/news/${encodeURIComponent(article.id)}`} key={article.id}>
                  {publishValue ? (
                    <span className="news-date-tag">
                      <span className="nd-day">{dayText(publishValue)}</span>
                      <span className="nd-month">{monthText(publishValue)}</span>
                    </span>
                  ) : null}
                  <span className="news-content">
                    <b className="news-title">{article.title}</b>
                    <span className="news-desc">{article.summary || '查看该资讯详情。'}</span>
                  </span>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="lead">纪检监察内容暂未发布，可在后台“新闻管理”中选择对应栏目发布，发布后将在此展示。</p>
        )}
      </div>
    </section>
  );
}

function CompanyCards({ companies }: { companies: Company[] }) {
  return (
    <section className="section" aria-label="下属公司">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>SUBSIDIARIES</span></div>
            <div className="h2">下属公司</div>
            <p className="lead">集中展示集团下属企业，可进入公司详情页查看职责、业务范围和联系信息。</p>
          </div>
        </div>
        <div className="grid">
          {companies.map((company) => (
            <a className="card reveal is-visible" href={`/org/${company.slug}`} key={company.slug} style={{ gridColumn: 'span 4', display: 'block' }}>
              <div style={{ height: 180, overflow: 'hidden' }}><img src={company.cover || fallbackCover} alt="" /></div>
              <div className="card-pad">
                <div className="pill">{companyDisplayLabel(company)}</div>
                <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{companyDisplayName(company)}</div>
                <div className="rich" style={{ marginTop: 8 }}>{companyDisplayIntro(company)}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const plainText = (value?: string) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const sectorIntroHtml = (value?: string) => {
  const intro = String(value || '').trim();
  if (!intro) return '<p>产业介绍待完善。</p>';
  if (/<[a-z][^>]*>/i.test(intro)) return intro;
  return intro.split(/\r?\n/).filter((line) => line.trim()).map((line) => `<p>${escapeHtml(line.trim())}</p>`).join('');
};
const sectorHref = (slug: string, basePath: string) => `${basePath}?sector=${encodeURIComponent(slug)}#sector-detail`;

function SectorDetail({ sector }: { sector: BusinessSector }) {
  return (
    <section className="section" id="sector-detail" aria-label={`${sector.name || sector.title || '产业布局'}详情`}>
      <div className="content">
        <div className="detail reveal is-visible">
          <div className="pill">产业布局详情</div>
          <h1 style={{ marginTop: 14 }}>{sector.name || sector.title || '产业布局'}</h1>
          {sector.cover ? <img src={sector.cover} alt={sector.name || sector.title || ''} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 16, marginTop: 20 }} /> : null}
          <div className="body" dangerouslySetInnerHTML={{ __html: sectorIntroHtml(sector.intro || sector.description) }} />
          <a className="pill" href="#sectors" style={{ display: 'inline-block', marginTop: 8 }}>返回产业布局</a>
        </div>
      </div>
    </section>
  );
}

function SectorCards({ sectors, activeSlug, basePath }: { sectors: BusinessSector[]; activeSlug?: string; basePath: string }) {
  return (
    <section className="section" id="sectors" aria-label="产业布局">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>BUSINESS PORTFOLIO</span></div>
            <div className="h2">产业体系</div>
            <p className="lead">展示集团产业体系宏观介绍，围绕交通建设、城乡建设、产业投资、运营服务等方向，构建投融建运协同发展格局。</p>
          </div>
        </div>
        {sectors.length ? <div className="grid">
          {sectors.map((sector, index) => (
            <a className="card reveal is-visible" href={sectorHref(sector.slug, basePath)} key={sector.slug || index} style={{ gridColumn: 'span 4', display: 'block', outline: sector.slug === activeSlug ? '2px solid rgba(24, 92, 175, .45)' : undefined }}>
              <div style={{ height: 180, overflow: 'hidden' }}><img src={sector.cover || fallbackCover} alt={sector.name || sector.title || ''} /></div>
              <div className="card-pad">
                <div className="pill">产业板块 {String(index + 1).padStart(2, '0')}</div>
                <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{sector.name || sector.title}</div>
                <div className="rich" style={{ marginTop: 8 }}>{plainText(sector.intro || sector.description) || '产业介绍待完善。'}</div>
                <div style={{ marginTop: 12, color: 'var(--blue)', fontWeight: 800, fontSize: 13 }}>查看详情 →</div>
              </div>
            </a>
          ))}
        </div> : <p className="lead">暂无已发布的产业内容，敬请关注。</p>}
      </div>
    </section>
  );
}

const innovationChannelSlugs = ['business-technology-innovation', 'technology-innovation'];
const innovationFallbackHref = `/news?channel=${encodeURIComponent(innovationChannelSlugs[0])}`;

type InnovationSectionData = {
  items: Article[];
  total: number;
  href: string;
  loadError: boolean;
};

const formatInnovationDate = (item: Article) => {
  const value = item.publishAt || item.publishDate || '';
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

async function loadInnovationSection(): Promise<InnovationSectionData> {
  let href = innovationFallbackHref;
  try {
    const channels = await getPublicChannels();
    const channel = innovationChannelSlugs
      .map((slug) => channels.find((item) => item.slug === slug))
      .find((item): item is Channel => Boolean(item))
      || channels.find((item) => item.name === '科技创新');
    if (!channel) return { items: [], total: 0, href, loadError: false };

    href = `/news?channel=${encodeURIComponent(channel.slug)}`;
    const payload = await getPublicArticles(new URLSearchParams({
      scope: 'news',
      channelSlug: channel.slug,
      pageSize: '3',
    }));
    return { items: payload.items, total: payload.total, href, loadError: false };
  } catch {
    return { items: [], total: 0, href, loadError: true };
  }
}

function InnovationSection({ data }: { data: InnovationSectionData }) {
  return (
    <section className="section" id="innovation" aria-label="科技创新">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>INNOVATION</span></div>
            <div className="h2">科技创新</div>
            <p className="lead">集中展示技术研发成果、创新案例与成果转化进展，点击成果可查看完整内容。</p>
          </div>
          <a className="btn" href={data.href}>查看全部</a>
        </div>
        {data.items.length ? (
          <>
            <div className="grid">
              {data.items.map((item) => (
                <a className="card reveal is-visible" href={`/news/${encodeURIComponent(item.id)}`} key={item.id} style={{ gridColumn: 'span 4', display: 'block' }}>
                  <div style={{ height: 180, overflow: 'hidden' }}><img src={item.cover || fallbackCover} alt={item.title} /></div>
                  <div className="card-pad">
                    <div className="pill">{item.newsSubcategory || '科技创新'}</div>
                    <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{item.title}</div>
                    <div className="rich" style={{ marginTop: 8 }}>{item.summary || '查看该科技成果详情。'}</div>
                    <div style={{ marginTop: 12, color: 'rgba(11,18,32,.52)', fontSize: 13 }}>{formatInnovationDate(item)}</div>
                  </div>
                </a>
              ))}
            </div>
            {data.total > data.items.length ? <p style={{ margin: '18px 0 0', color: 'rgba(11,18,32,.55)', fontSize: 13 }}>共 {data.total} 项科技成果，点击“查看全部”浏览完整列表。</p> : null}
          </>
        ) : (
          <div className="card" role="status">
            <div className="card-pad">
              <div className="pill">{data.loadError ? '加载失败' : '暂无内容'}</div>
              <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 20 }}>{data.loadError ? '科技创新内容暂时无法加载' : '科技创新内容暂未发布'}</div>
              <p style={{ margin: '8px 0 0', color: 'rgba(11,18,32,.62)', lineHeight: 1.9 }}>
                {data.loadError ? '请稍后重试，或进入科技创新栏目查看已发布内容。' : '网站编辑可在后台“新闻管理”中选择“科技创新”栏目发布科技成果，发布后将在此展示。'}
              </p>
              <a className="btn btn--primary" href={data.href} style={{ marginTop: 16 }}>进入科技创新栏目</a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export async function GenericSinglePage({ slug }: { slug: keyof typeof pageMeta }) {
  if (slug === 'about') {
    const [groupIntro, historyTimeline] = await Promise.all([
      getPublicGroupIntro().catch(() => null),
      getPublicHistoryTimeline().catch(() => null),
    ]);
    // 接口失败时沿用原静态时间轴；接口正常但无启用条目时展示空状态，确保后台启停生效。
    return <AboutPage page={groupIntro} timeline={historyTimeline === null ? fallbackHistoryTimeline : visibleHistoryTimeline(historyTimeline)} />;
  }
  const page = await loadPage(slug);
  const meta = pageMeta[slug];
  if (!page) notFound();
  const contactInfo = slug === 'contact' ? await getPublicContactInfo() : null;
  const innovation = slug === 'projects' ? await loadInnovationSection() : null;
  const reportConfig = slug === 'cleanGov' ? await getPublicReportConfig() : null;
  const reportArticles = reportConfig?.enabled ? await getPublicReportArticles(reportConfig) : [];

  return (
    <Shell active={meta.active}>
      <Breadcrumb title={page.title || meta.title} />
      <main className="page" aria-label="主要内容">
        <Hero title={page.title || meta.title} kicker={meta.kicker} subtitle={meta.subtitle} cover={page.cover} ctaLabel={meta.cta || '查看内容'} />
        {contactInfo ? <ContactInfoSection contactInfo={contactInfo} /> : null}
        {reportConfig?.enabled ? <ReportEntrySection config={reportConfig} /> : null}
        {reportConfig?.enabled ? <DisciplineNewsSection articles={reportArticles} channelSlug={reportConfig.articleChannelSlug} /> : null}
        <ContentSection page={page} />
        {innovation ? <InnovationSection data={innovation} /> : null}
        {slug === 'projects' ? <ProjectMap /> : null}
      </main>
    </Shell>
  );
}

export async function LeadershipPage() {
  let leaders: Awaited<ReturnType<typeof getPublicLeaders>> = [];
  let hasLoadError = false;
  try {
    leaders = await getPublicLeaders();
  } catch {
    hasLoadError = true;
  }

  return (
    <Shell active="about">
      <Breadcrumb title="领导致辞" />
      <main className="page" aria-label="领导致辞" data-leadership-page>
        <Hero
          title="领导致辞"
          kicker="LEADERSHIP MESSAGE"
          subtitle="凝聚发展共识，携手谱写甘孜州建设投资集团高质量发展新篇章。"
          cover="/img/雅砻江大桥.jpg"
          ctaHref="#leadership-content"
          ctaLabel="查看致辞"
          stats={[]}
        />
        <section className="section leadership-message-section" id="leadership-content" aria-label="集团领导致辞">
          <div className="content">
            <div className="section-head">
              <div><div className="kicker"><i aria-hidden="true" /><span>LEADERSHIP MESSAGE</span></div><h2 className="h2">集团领导致辞</h2></div>
            </div>
            {hasLoadError ? <div className="leadership-empty" role="status">领导致辞暂时无法加载，请稍后再试。</div> : leaders.length ? (
              <div className="leadership-message-list">
                {leaders.map((leader) => (
                  <article className="leader-message-card" key={leader.id}>
                    <div className="leader-message-photo-wrap">
                      <LeadershipPortrait className="leader-message-photo" src={leader.photo} name={leader.name} />
                    </div>
                    <div className="leader-message-copy">
                      <p className="leader-message-kicker">集团领导 · 领导致辞</p>
                      <h3>{leader.name}</h3>
                      {leader.position ? <p className="leader-message-position">{leader.position}</p> : null}
                      {leader.speech.trim() ? <div className="leader-message-body">{leader.speech}</div> : <p className="leader-message-unavailable">致辞内容暂未发布，敬请关注。</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="leadership-empty">领导致辞内容暂未发布，敬请关注。</div>}
          </div>
        </section>
      </main>
    </Shell>
  );
}

export async function HonorsPage() {
  let honors: HonorItem[] = [];
  let hasLoadError = false;
  try {
    honors = await getPublicHonors();
  } catch {
    hasLoadError = true;
  }

  return (
    <Shell active="about">
      <Breadcrumb title="企业荣誉" />
      <main className="page" aria-label="企业荣誉" data-honors-page>
        <Hero
          title="企业荣誉"
          kicker="CORPORATE HONORS"
          subtitle="记录集团在交通建设、城乡发展与国企担当中的荣誉资质，见证每一份认可与责任。"
          cover="/img/雅砻江大桥.jpg"
          ctaHref="#honors-content"
          ctaLabel="查看荣誉"
          stats={[]}
        />
        <section className="section honors-section" id="honors-content" aria-label="荣誉资质">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>HONORS &amp; QUALIFICATIONS</span></div>
                <h2 className="h2">荣誉资质</h2>
                <p className="lead">按排序展示集团及所属企业获得的重要荣誉、资质证书与表彰文件。</p>
              </div>
            </div>
            {hasLoadError ? <div className="honors-empty" role="status">企业荣誉内容暂时无法加载，请稍后再试。</div> : honors.length ? (
              <div className="honors-grid">
                {honors.map((honor, index) => (
                  <article className="honor-card reveal is-visible" key={honor.id} style={{ '--i': index } as CSSProperties}>
                    <div className="honor-certificate">
                      {honor.image ? (
                        <a href={honor.image} target="_blank" rel="noreferrer" aria-label={`查看${honor.title}证书大图`}>
                          <img src={honor.image} alt={`${honor.title}证书`} loading="lazy" />
                        </a>
                      ) : <div className="honor-certificate-placeholder"><span>荣誉证书</span><small>暂未上传</small></div>}
                      {honor.year ? <span className="honor-year">{honor.year}</span> : null}
                    </div>
                    <div className="honor-card-body">
                      <h3>{honor.title}</h3>
                      {honor.description ? <p>{honor.description}</p> : null}
                      {honor.attachmentUrl ? (
                        <a className="honor-attachment" href={honor.attachmentUrl} target="_blank" rel="noreferrer">
                          <span aria-hidden="true">附件</span>{honor.attachmentName || '查看荣誉附件'}
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="honors-empty" role="status">企业荣誉内容暂未发布，敬请关注。</div>}
          </div>
        </section>
      </main>
    </Shell>
  );
}

function AboutPage({ page, timeline }: { page: PageContent | null; timeline: HistoryTimelineItem[] }) {
  const config = getGroupIntroConfig(page?.extra_json) as GroupIntroConfig;
  const heroStats = Array.isArray(config.heroStats) ? config.heroStats.filter((item): item is GroupIntroStat => Boolean(item?.value && item?.label)) : [];
  const achievements = Array.isArray(config.achievements) ? config.achievements.filter((item): item is GroupIntroAchievement => Boolean(item?.value && item?.label)) : [];
  const profileBadges = Array.isArray(config.profileBadges) ? config.profileBadges.filter(Boolean) : [];
  const performanceParagraphs = Array.isArray(config.performanceParagraphs) ? config.performanceParagraphs.filter(Boolean) : [];
  const missionParagraphs = Array.isArray(config.missionParagraphs) ? config.missionParagraphs.filter(Boolean) : [];
  const hasProfile = Boolean(page?.content?.trim());
  return (
    <Shell active="about">
      <Breadcrumb title="集团概况" />
      <main className="page" aria-label="主要内容" data-about-page>
        <Hero
          title={page?.title || '集团概况'}
          kicker="ABOUT GZJT"
          subtitle={page?.subtitle || page?.summary || ''}
          cover={page?.cover || '/img/318康定市过境段公路工程项目434互通工程.jpg'}
          ctaHref="#content"
          ctaLabel="了解集团"
          stats={heroStats}
        />

        <section className="section about-profile" id="content" aria-label="集团简介">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>COMPANY PROFILE</span></div>
                <div className="h2">{page?.title || '集团简介'}</div>
              </div>
            </div>

            <div className="about-profile-grid">
              <article className="about-copy about-copy--profile reveal is-visible" data-about-tilt>
                {config.profileMarker ? <div className="about-copy-marker" aria-hidden="true">{config.profileMarker}</div> : null}
                {hasProfile ? <div className="body" dangerouslySetInnerHTML={{ __html: page?.content || '' }} /> : <p>集团简介内容暂未发布，敬请关注。</p>}
                {profileBadges.length ? <div className="about-profile-badges" aria-label="集团职责关键词">
                  {profileBadges.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
                </div> : null}
              </article>

              {config.principleTitle ? <aside className="about-principle reveal is-visible" aria-label={config.principleLabel || '企业宗旨'} data-about-tilt>
                <div className="about-roadline" aria-hidden="true"><span /><span /><span /></div>
                <div className="about-principle-label">{config.principleLabel}</div>
                <div className="about-principle-title">{config.principleTitle.split('\n').map((line, index) => <span key={index}>{index ? <br /> : null}{line}</span>)}</div>
                {config.principleEnglish?.filter(Boolean).map((line, index) => <div className="about-principle-en" key={`${line}-${index}`}>{line}</div>)}
              </aside> : null}
            </div>
          </div>
        </section>

        <section className="section about-history" aria-label="发展沿革">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>DEVELOPMENT HISTORY</span></div>
                <div className="h2">发展沿革</div>
              </div>
            </div>
            <div className="about-timeline">
              {timeline.length ? timeline.map((item, index) => (
                <article className="about-timeline-item reveal is-visible" key={item.id || `${item.year}-${item.title}-${index}`} data-about-tilt style={{ '--i': index } as CSSProperties}>
                  {item.year ? <div className="about-timeline-year">{item.year}</div> : null}
                  <h3>{item.title}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                </article>
              )) : <div className="about-history-empty" role="status">发展历程内容暂未发布，敬请关注。</div>}
            </div>
          </div>
        </section>

        {achievements.length || performanceParagraphs.length || config.performanceLead ? <section className="section about-performance" aria-label="建设成果">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>PROJECT DELIVERY</span></div>
                <div className="h2">{config.performanceTitle || '建设与经营成果'}</div>
                {config.performanceLead ? <p className="lead">{config.performanceLead}</p> : null}
              </div>
            </div>
            <div className="about-achievements">
              {achievements.map((item, index) => (
                <div className="about-achievement reveal is-visible" key={`${item.label}-${index}`} data-about-tilt>
                  <em>{item.accent}</em>
                  <strong
                    {...(typeof item.target === 'number' ? {
                      'data-countup': '',
                      'data-target': String(item.target),
                      'data-decimals': String(item.decimals || 0),
                    } : {})}
                  >
                    {typeof item.target === 'number' ? <><span data-num>{item.target.toFixed(item.decimals || 0)}</span>{item.suffix}</> : item.value}
                  </strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            {performanceParagraphs.length ? <div className="about-copy about-copy--wide reveal is-visible" data-about-tilt>
              {performanceParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div> : null}
          </div>
        </section> : null}

        {config.missionTitle || missionParagraphs.length ? <section className="section about-mission" aria-label="企业使命">
          <div className="content">
            <div className="about-mission-panel reveal is-visible" data-about-tilt>
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>MISSION AND VISION</span></div>
                {config.missionTitle ? <h2>{config.missionTitle}</h2> : null}
              </div>
              {missionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </div>
        </section> : null}

      </main>
    </Shell>
  );
}

export async function BusinessPage({ selectedSlug, basePath = '/business' }: { selectedSlug?: string; basePath?: string } = {}) {
  const sectors = await loadBusinessSectors();
  const selectedSector = selectedSlug ? sectors.find((sector) => sector.slug === selectedSlug) : undefined;
  return (
    <Shell active="businessDev" actionHref="/projects" actionLabel="查看项目">
      <Breadcrumb title="产业布局" />
      <main className="page" aria-label="主要内容">
        <Hero title="产业布局" kicker="BUSINESS PORTFOLIO" subtitle="展示集团产业体系宏观介绍，围绕基础设施建设与区域发展，形成投融建运协同的产业布局。" cover="/img/318康定市过境段公路工程项目434互通工程.jpg" ctaHref="#sectors" ctaLabel="查看产业布局" />
        {selectedSector ? <SectorDetail sector={selectedSector} /> : null}
        <SectorCards sectors={sectors} activeSlug={selectedSector?.slug} basePath={basePath} />
      </main>
    </Shell>
  );
}

export async function OrgListPage() {
  const companies = await loadCompanies();
  return (
    <Shell active="about">
      <Breadcrumb title="下属公司" />
      <main className="page" aria-label="主要内容">
        <Hero title="下属公司" kicker="SUBSIDIARIES" subtitle="形成集团总部、专业子公司、项目公司的组织体系，保障战略落地与专业化运营。" cover="/img/雅砻江大桥.jpg" ctaHref="#companies" ctaLabel="查看公司" />
        <div id="companies"><CompanyCards companies={companies} /></div>
      </main>
    </Shell>
  );
}

function CompanyNewsPager({ slug, page, pageSize, total }: { slug: string; page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const current = Math.min(page, pages);
  const visible = Array.from({ length: pages }, (_, index) => index + 1)
    .filter((item) => pages <= 7 || item === 1 || item === pages || Math.abs(item - current) <= 1);
  const href = (targetPage: number) => targetPage <= 1 ? `/org/${encodeURIComponent(slug)}` : `/org/${encodeURIComponent(slug)}?page=${targetPage}`;

  return (
    <nav className="pagination company-news-pagination" style={{ marginTop: 24 }} aria-label="公司动态分页">
      <a className={`page-btn page-btn--nav${current <= 1 ? ' is-disabled' : ''}`} href={href(Math.max(1, current - 1))} aria-disabled={current <= 1 ? 'true' : undefined}><span aria-hidden="true">‹</span> 上一页</a>
      <span className="page-count">第 {current} / {pages} 页，共 {total} 条</span>
      {visible.map((item, index) => (
        <span key={item}>
          {index > 0 && item - visible[index - 1] > 1 ? <span style={{ opacity: .55, padding: '0 6px' }}>…</span> : null}
          <a className={`page-btn${item === current ? ' is-active' : ''}`} href={href(item)} aria-current={item === current ? 'page' : undefined}>{item}</a>
        </span>
      ))}
      <a className={`page-btn page-btn--nav${current >= pages ? ' is-disabled' : ''}`} href={href(Math.min(pages, current + 1))} aria-disabled={current >= pages ? 'true' : undefined}>下一页 <span aria-hidden="true">›</span></a>
    </nav>
  );
}

export async function CompanyDetailPage({ slug, page = 1 }: { slug: string; page?: number }) {
  const company = await loadCompany(slug);
  if (!company) notFound();
  const title = companyDisplayName(company);
  const label = companyDisplayLabel(company);
  const intro = companyDisplayIntro(company);
  const companyNewsPageSize = 10;
  const companyArticles = await getPublicArticles(new URLSearchParams({ page: String(page), pageSize: String(companyNewsPageSize) }), company.id).catch(() => ({ page, pageSize: companyNewsPageSize, total: 0, items: [] }));

  return (
    <Shell active="about" actionHref="/org" actionLabel="返回公司列表">
      <Breadcrumb title={title} />
      <main className="page" aria-label="主要内容">
        <Hero title={title} kicker="COMPANY PROFILE" subtitle={intro} cover={company.cover} ctaHref="#profile" ctaLabel="查看详情" />
        <section className="section" id="profile" aria-label="公司详情">
          <div className="content">
            <div className="detail reveal is-visible">
              <h1>{title}</h1>
              <div className="meta">简称：{label}</div>
              <div className="body">
                <p>{intro}</p>
                {company.mainBusiness && !isPlaceholderText(company.mainBusiness) ? <p><b>主营业务：</b>{company.mainBusiness}</p> : null}
                {company.address && !isPlaceholderText(company.address) ? <p><b>注册地址：</b>{company.address}</p> : null}
                {company.registeredCapital && !isPlaceholderText(company.registeredCapital) ? <p><b>注册资本：</b>{company.registeredCapital}</p> : null}
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btn--primary" href="/org">返回公司列表</a>
                <a className="btn" href="/contact-us">联系集团</a>
              </div>
            </div>
          </div>
        </section>
        {companyArticles.total > 0 && <section className="section" aria-label="公司动态"><div className="content"><div className="section-head"><div><div className="kicker"><i aria-hidden="true" /><span>COMPANY NEWS</span></div><h2 className="h2">公司动态</h2></div></div><div className="news-list">{companyArticles.items.map((article) => <a className="news-row" href={`/news/${encodeURIComponent(article.id)}`} key={article.id}><span>{article.title}</span><time>{article.publishDate}</time></a>)}</div><CompanyNewsPager slug={slug} page={page} pageSize={companyArticles.pageSize} total={companyArticles.total} /></div></section>}
      </main>
    </Shell>
  );
}

function ProjectMap() {
  return (
    <section className="section" id="map" aria-label="项目地图">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>PROJECT MAP</span></div>
            <div className="h2">项目地图</div>
            <p className="lead">重点展示集团交通、城乡基础设施与产业项目的区域分布。</p>
          </div>
        </div>
        <div className="proj-map reveal is-visible">
          <div className="proj-map-stage">
            <img src="/img/map.png" alt="甘孜州项目分布地图" />
            <div className="proj-points">
              {[
                ['甘孜县', '49.5%', '44.2%'],
                ['理塘县', '45.4%', '55.0%'],
                ['康定市', '55.4%', '55.4%'],
                ['泸定县', '62.5%', '60.6%'],
                ['稻城县', '54.8%', '71.5%'],
              ].map(([place, left, top], index) => (
                <div className="proj-point" data-place={place} style={{ left, top, '--delay': `${index * 0.3}s` } as CSSProperties} key={place}>
                  <span className="dot" /><span className="pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
