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
type HeroStat = { value: string; label: string };
type AboutAchievement = { value: string; label: string; accent: string; target?: number; decimals?: number; suffix?: string };

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

const defaultHeroStats: HeroStat[] = [
  { value: '公开', label: '信息发布' },
  { value: '协同', label: '业务联动' },
  { value: '规范', label: '运营管理' },
  { value: '服务', label: '发展大局' },
];

const aboutStats: HeroStat[] = [
  { value: '10亿元', label: '注册资本' },
  { value: '85.56亿元', label: '总资产' },
  { value: '9家', label: '二级子公司' },
  { value: '17个', label: '专业资质' },
];

const aboutAchievements: AboutAchievement[] = [
  { value: '50个', label: '近5年承担国省公路改扩建项目', accent: '项目集群', target: 50, suffix: '个' },
  { value: '2248.4公里', label: '建设里程', accent: '通达里程', target: 2248.4, decimals: 1, suffix: '公里' },
  { value: '175.6亿元', label: '完成投资', accent: '投资强度', target: 175.6, decimals: 1, suffix: '亿元' },
  { value: '13.38亿元', label: '累计营业收入', accent: '经营质效', target: 13.38, decimals: 2, suffix: '亿元' },
  { value: '1.74亿元', label: '累计利润总额', accent: '价值创造', target: 1.74, decimals: 2, suffix: '亿元' },
  { value: '27% / 19%', label: '营收与利润年均增长率', accent: '年均增长' },
];

const aboutProfileBadges = ['投融资', '建设开发', '资产经营', '工程服务'];

const aboutTimeline = [
  {
    year: '前身',
    title: '甘孜州交通基础设施建设领导小组办公室',
    desc: '承担交通基础设施建设相关组织协调工作，为后续集团化运作奠定基础。',
  },
  {
    year: '2018.05',
    title: '组建甘孜州交通投资建设集团有限公司',
    desc: '根据改革发展需要，正式推进市场化、集团化、专业化建设。',
  },
  {
    year: '2018.12',
    title: '更名为甘孜州交通和城乡建设投资集团有限公司',
    desc: '甘孜州城投公司整体划入集团，交通与城乡建设职责进一步整合。',
  },
  {
    year: '2025.05',
    title: '更名为甘孜州建设投资集团有限公司',
    desc: '企业名称与发展定位更加统一，持续服务全州交通和城乡基础设施建设。',
  },
];

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
        <div className="glass reveal is-visible" aria-label="页面速览">
          <div className="kpi-grid">
            {stats.map((item) => (
              <div className="kpi" key={`${item.value}-${item.label}`}><b>{item.value}</b><span>{item.label}</span></div>
            ))}
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

function SectorCards({ sectors }: { sectors: BusinessSector[] }) {
  return (
    <section className="section" id="sectors" aria-label="业务板块">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>BUSINESS PORTFOLIO</span></div>
            <div className="h2">业务板块</div>
            <p className="lead">围绕交通建设、城乡建设、产业投资、运营服务等方向，构建投融建运协同发展格局。</p>
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
  const meta = pageMeta[slug];
  if (!page) notFound();

  if (slug === 'about') {
    return <AboutPage cover={page.cover} />;
  }

  return (
    <Shell active={meta.active}>
      <Breadcrumb title={page.title || meta.title} />
      <main className="page" aria-label="主要内容">
        <Hero title={page.title || meta.title} kicker={meta.kicker} subtitle={meta.subtitle} cover={page.cover} ctaLabel={meta.cta || '查看内容'} />
        <ContentSection page={page} />
        {slug === 'projects' ? <ProjectMap /> : null}
      </main>
    </Shell>
  );
}

function AboutPage({ cover }: { cover?: string }) {
  return (
    <Shell active="about">
      <Breadcrumb title="集团概况" />
      <main className="page" aria-label="主要内容" data-about-page>
        <Hero
          title="集团概况"
          kicker="ABOUT GZJT"
          subtitle="州属一级国有企业，服务全州交通和城乡基础设施投融资、建设、开发与资产经营。"
          cover={cover || '/img/318康定市过境段公路工程项目434互通工程.jpg'}
          ctaHref="#content"
          ctaLabel="了解集团"
          stats={aboutStats}
        />

        <section className="section about-profile" id="content" aria-label="集团简介">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>COMPANY PROFILE</span></div>
                <div className="h2">甘孜州建设投资集团有限公司</div>
              </div>
            </div>

            <div className="about-profile-grid">
              <article className="about-copy about-copy--profile reveal is-visible" data-about-tilt>
                <div className="about-copy-marker" aria-hidden="true">州属一级国有企业</div>
                <p>甘孜州建设投资集团有限公司为州属一级国有企业。前身为甘孜州交通基础设施建设领导小组办公室，2018年5月，根据改革发展需要，组建了甘孜州交通投资建设集团有限公司；2018年12月，甘孜州城投公司整体划入集团，更名为甘孜州交通和城乡建设投资集团有限公司；2025年5月更名为甘孜州建设投资集团有限公司。</p>
                <p>集团主要承担全州政府性投资的交通和城乡基础设施项目的投融资、建设、开发、资产经营等职责，经营范围涉及交通和城乡基础设施工程的建设、管理、测绘、勘察、监理、检测等业务，注册资本10亿元，总资产85.56亿元。</p>
                <p>集团下设二级子公司9家，其中全资5家、控股2家、参股2家；三级子公司3家，均为控股公司；下属规上、限上企业6家，具备公路工程、房建市政施工总承包等资质17个。</p>
                <div className="about-profile-badges" aria-label="集团职责关键词">
                  {aboutProfileBadges.map((item) => <span key={item}>{item}</span>)}
                </div>
              </article>

              <aside className="about-principle reveal is-visible" aria-label="企业宗旨" data-about-tilt>
                <div className="about-roadline" aria-hidden="true"><span /><span /><span /></div>
                <div className="about-principle-label">企业宗旨</div>
                <div className="about-principle-title">匠心筑路 畅通甘孜<br />建者无疆 善作善成</div>
                <div className="about-principle-en">INGENUITY BUILDS ROADS, SMOOTH GANZI</div>
                <div className="about-principle-en">BUILDERS ARE BOUNDLESS, GOOD DEEDS</div>
              </aside>
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
              {aboutTimeline.map((item, index) => (
                <article className="about-timeline-item reveal is-visible" key={item.year} data-about-tilt style={{ '--i': index } as CSSProperties}>
                  <div className="about-timeline-year">{item.year}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section about-performance" aria-label="建设成果">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>PROJECT DELIVERY</span></div>
                <div className="h2">建设与经营成果</div>
                <p className="lead">集团自组建以来，在州委、州政府的坚强领导下，在州国资委、州交通运输局、州住房和城乡建设局的精心指导下，紧绕“交通先行”“城乡提升”“乡村振兴”战略，全力抓好重点交通和城建项目建设及企业经营发展等工作。</p>
              </div>
            </div>
            <div className="about-achievements">
              {aboutAchievements.map((item) => (
                <div className="about-achievement reveal is-visible" key={item.label} data-about-tilt>
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
            <div className="about-copy about-copy--wide reveal is-visible" data-about-tilt>
              <p>近5年来，集团共承担CZ铁路配套公路、“9.5”泸定灾后重建、大香格里拉交旅融合等50个2248.4公里的国省公路改扩建项目，完成投资175.6亿元，以万里通途托起沿线百姓的团结梦、致富梦、发展梦。</p>
              <p>集团累计实现营业收入13.38亿元、实现利润总额1.74亿元，年均增长率分别为27%、19%。</p>
            </div>
          </div>
        </section>

        <section className="section about-mission" aria-label="企业使命">
          <div className="content">
            <div className="about-mission-panel reveal is-visible" data-about-tilt>
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>MISSION AND VISION</span></div>
                <h2>铺筑人民幸福之路，建造甘孜发展之基</h2>
              </div>
              <p>近年来，集团公司紧扣州委“12345”总体工作格局，紧紧围绕集团“1344”发展战略目标，秉承“铺筑人民幸福之路、建造甘孜发展之基”的企业使命，以“赤诚奉献、克难奋进、求实求精、创新有为”的企业精神，按照“科学发展，诚实守信，质效至上，价值创造，守法合规，行稳致远”的经营理念，全力打造涉藏地区交通产业为引领的一流综合性投资运营商。</p>
              <p>集团将持续为建设和谐美丽现代化新甘孜、加快涉藏地区交通基础设施建设步伐、筑牢中华民族共同体意识贡献建投力量。</p>
            </div>
          </div>
        </section>

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
  const title = companyDisplayName(company);
  const label = companyDisplayLabel(company);
  const intro = companyDisplayIntro(company);

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
