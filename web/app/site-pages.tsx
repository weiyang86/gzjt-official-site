import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { Drawer, Footer, Header, NewsAssets, type NavKey } from './news/components';
import {
  getPublicBusinessSectors,
  getPublicCompanies,
  getPublicCompanyBySlug,
  getPublicPageBySlug,
} from '@/lib/cms';
import {
  fallbackBusinessSectors,
  fallbackCompanies,
  fallbackCompanyBySlug,
  fallbackPageBySlug,
} from '@/lib/cms/fallback-site';
import type { BusinessSector, Company, PageContent } from '@/types/cms';

type ActiveKey = NavKey;

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
    subtitle: '欢迎通过在线服务、业务咨询、合作对接等方式与我们取得联系。',
    cta: '联系信息',
  },
};

const fallbackCover = '/img/雅砻江大桥.jpg';

async function loadPage(slug: string): Promise<PageContent | null> {
  try {
    return await getPublicPageBySlug(slug) || fallbackPageBySlug(slug);
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
    const sectors = await getPublicBusinessSectors();
    return sectors.length ? sectors : fallbackBusinessSectors;
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

function Hero({ title, kicker, subtitle, cover, ctaHref = '#content', ctaLabel = '查看内容' }: {
  title: string;
  kicker: string;
  subtitle: string;
  cover?: string;
  ctaHref?: string;
  ctaLabel?: string;
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
        <div className="glass reveal is-visible" aria-label="页面速览">
          <div className="kpi-grid">
            <div className="kpi"><b>CMS</b><span>内容模型</span></div>
            <div className="kpi"><b>Next</b><span>页面重构</span></div>
            <div className="kpi"><b>HTML</b><span>视觉延续</span></div>
            <div className="kpi"><b>Trae</b><span>可微调</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Shell({ active, children, actionHref = '/contact-us', actionLabel = '在线服务' }: {
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
          <a href="/" data-no-transition>首页</a>
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
            <p className="lead">内容来自 CMS 单页模型；Directus 不可用时显示本地 fallback。</p>
          </div>
        </div>
        <div className="detail reveal is-visible">
          <div className="body" dangerouslySetInnerHTML={{ __html: page.content || '<p>暂无内容。</p>' }} />
        </div>
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
                <div className="pill">{company.shortName || '下属公司'}</div>
                <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{company.name}</div>
                <div className="rich" style={{ marginTop: 8 }}>{company.intro || company.description || '查看公司详情。'}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectorCards({ sectors }: { sectors: BusinessSector[] }) {
  return (
    <section className="section" id="sectors" aria-label="业务板块">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>BUSINESS PORTFOLIO</span></div>
            <div className="h2">业务板块</div>
            <p className="lead">业务板块来自 `business_sectors` 内容模型；未配置时显示本地示例。</p>
          </div>
        </div>
        <div className="grid">
          {sectors.map((sector) => (
            <article className="card reveal is-visible" key={sector.slug} style={{ gridColumn: 'span 4' }}>
              <div style={{ height: 180, overflow: 'hidden' }}><img src={sector.cover || fallbackCover} alt="" /></div>
              <div className="card-pad">
                <div className="pill">{sector.slug}</div>
                <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{sector.name || sector.title}</div>
                <div className="rich" style={{ marginTop: 8 }}>{sector.intro || sector.description || '业务介绍待完善。'}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function GenericSinglePage({ slug }: { slug: keyof typeof pageMeta }) {
  const page = await loadPage(slug);
  const companies = slug === 'about' ? await loadCompanies() : [];
  const meta = pageMeta[slug];
  if (!page) notFound();

  return (
    <Shell active={meta.active}>
      <Breadcrumb title={page.title || meta.title} />
      <main className="page" aria-label="主要内容">
        <Hero title={page.title || meta.title} kicker={meta.kicker} subtitle={meta.subtitle} cover={page.cover} ctaLabel={meta.cta || '查看内容'} />
        <ContentSection page={page} />
        {slug === 'projects' ? <ProjectMap /> : null}
        {companies.length ? <CompanyCards companies={companies} /> : null}
      </main>
    </Shell>
  );
}

export async function BusinessPage() {
  const sectors = await loadBusinessSectors();
  return (
    <Shell active="businessDev" actionHref="/projects" actionLabel="查看项目">
      <Breadcrumb title="业务发展" />
      <main className="page" aria-label="主要内容">
        <Hero title="业务发展" kicker="BUSINESS PORTFOLIO" subtitle="围绕基础设施建设与区域发展，形成投融建运协同的业务板块。" cover="/img/318康定市过境段公路工程项目434互通工程.jpg" ctaHref="#sectors" ctaLabel="查看业务板块" />
        <SectorCards sectors={sectors} />
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

export async function CompanyDetailPage({ slug }: { slug: string }) {
  const company = await loadCompany(slug);
  if (!company) notFound();

  return (
    <Shell active="about" actionHref="/org" actionLabel="返回公司列表">
      <Breadcrumb title={company.name} />
      <main className="page" aria-label="主要内容">
        <Hero title={company.name} kicker="COMPANY PROFILE" subtitle={company.intro || company.description || '下属公司详情'} cover={company.cover} ctaHref="#profile" ctaLabel="查看详情" />
        <section className="section" id="profile" aria-label="公司详情">
          <div className="content">
            <div className="detail reveal is-visible">
              <h1>{company.name}</h1>
              <div className="meta">简称：{company.shortName || '—'} · 状态：{company.status || 'enabled'}</div>
              <div className="body">
                <p>{company.intro || company.description || '公司简介待完善。'}</p>
                <p><b>主营业务：</b>{company.mainBusiness || '待完善'}</p>
                <p><b>注册地址：</b>{company.address || '待完善'}</p>
                <p><b>注册资本：</b>{company.registeredCapital || '待完善'}</p>
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btn--primary" href="/org">返回公司列表</a>
                <a className="btn" href="/contact-us">联系集团</a>
              </div>
            </div>
          </div>
        </section>
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
            <p className="lead">保留旧页面项目地图视觉，后续可接入项目内容模型。</p>
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
