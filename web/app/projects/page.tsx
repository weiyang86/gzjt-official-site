import type { Metadata } from 'next';
import { getPublicPageBySlug, getPublicProjects } from '@/lib/cms';
import { buildSeoMetadata } from '@/lib/cms/seo';
import { fallbackPageBySlug } from '@/lib/cms/fallback-site';
import type { PageContent, Project } from '@/types/cms';
import { Drawer, Footer, Header, NewsAssets } from '../news/components';
import { ProjectExplorer } from './project-explorer';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: '/projects' });
}

const defaultPage: PageContent = {
  id: 'projects',
  title: '项目展示',
  slug: 'projects',
  cover: '/img/map.png',
  status: 'published',
  content: '<p>项目展示集中呈现集团重点交通、城乡基础设施、产业与文旅项目，展现服务区域发展和民生改善的建设成果。</p>',
};

async function loadPage(): Promise<PageContent> {
  try {
    const page = await getPublicPageBySlug('projects');
    if (page) return page;
  } catch {
    // 接口异常时回退到本地静态内容，避免页面空白。
  }
  return fallbackPageBySlug('projects') || defaultPage;
}

async function loadProjects(): Promise<Project[]> {
  try {
    return await getPublicProjects();
  } catch {
    return [];
  }
}

function ProjectsHero({ page }: { page: PageContent }) {
  return (
    <section className="hero">
      <div className="hero-bg"><img alt="" src={page.cover || '/img/map.png'} /></div>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-noise" aria-hidden="true" />
      <div className="content hero-inner">
        <div>
          <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>PROJECTS</span></div>
          <h1 className="hero-title reveal is-visible">{page.title || '项目展示'}</h1>
          <p className="hero-sub reveal is-visible">集中呈现集团重点交通、城乡基础设施、产业与文旅项目。</p>
          <div className="hero-cta reveal is-visible">
            <a className="btn btn--primary" href="#map" data-no-transition>查看项目地图</a>
            <a className="btn" href="#list" data-no-transition>查看项目列表</a>
          </div>
        </div>
        <div className="glass reveal is-visible" aria-label="页面速览">
          <div className="kpi-grid">
            <div className="kpi"><b>项目</b><span>数据展示</span></div>
            <div className="kpi"><b>地图</b><span>区域分布</span></div>
            <div className="kpi"><b>列表</b><span>分类筛选</span></div>
            <div className="kpi"><b>详情</b><span>建设信息</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function ProjectsPage() {
  const [page, projects] = await Promise.all([loadPage(), loadProjects()]);

  return (
    <>
      <NewsAssets />
      <Header active="businessDev" />
      <Drawer active="businessDev" />
      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/home" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>项目展示</span>
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容">
        <ProjectsHero page={page} />
        <section className="section" id="content" aria-label="项目展示说明">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>CONTENT</span></div>
                <div className="h2">{page.title || '项目展示'}</div>
              </div>
            </div>
            <div className="detail reveal is-visible">
              <div className="body" dangerouslySetInnerHTML={{ __html: page.content || '<p>暂无内容。</p>' }} />
            </div>
          </div>
        </section>
        <ProjectExplorer projects={projects} />
      </main>
      <Footer />
    </>
  );
}
