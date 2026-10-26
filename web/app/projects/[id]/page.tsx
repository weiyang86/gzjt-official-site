import { notFound } from 'next/navigation';
import { getPublicProjectById, getPublicProjects } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from '../../news/components';

export const dynamic = 'force-dynamic';

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

const fallbackProjectImage = '/img/雅砻江大桥.jpg';

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getPublicProjectById(id).catch(() => null);
  if (!project) notFound();

  const related = await getPublicProjects()
    .then((items) => items
      .filter((item) => item.id !== project.id && (!project.type || item.type === project.type))
      .slice(0, 3))
    .catch(() => []);

  const meta = [
    project.type ? `类型：${project.type}` : '',
    project.location ? `位置：${project.location}` : '',
    project.progress ? `建设进度：${project.progress}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <>
      <NewsAssets />
      <Header />
      <Drawer />
      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <a href="/projects" data-no-transition>项目展示</a>
            <span className="crumb-sep">›</span>
            <span>项目详情</span>
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容" data-detail="project">
        <section className="section" aria-label="正文">
          <div className="content">
            <div className="detail reveal is-visible">
              <div style={{ borderRadius: 24, overflow: 'hidden', height: 260, position: 'relative' }}>
                <img alt="" src={project.image || fallbackProjectImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,18,32,.06),rgba(11,18,32,.62))' }} />
              </div>
              <h1 style={{ marginTop: 18 }}>{project.name}</h1>
              {meta ? <div className="meta">{meta}</div> : null}
              {project.summary ? <p className="lead" style={{ marginTop: 12 }}>{project.summary}</p> : null}
              {project.detail ? (
                <div className="body" dangerouslySetInnerHTML={{ __html: project.detail }} />
              ) : (
                <div className="body"><p>暂无项目详情。</p></div>
              )}
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btn--primary" href="/projects">返回项目列表</a>
                <a className="btn" href="/contact-us">联系我们</a>
              </div>
            </div>

            {related.length ? (
              <>
                <div className="section-head reveal is-visible" style={{ marginTop: 32 }}>
                  <div>
                    <div className="kicker"><i aria-hidden="true" /><span>RELATED PROJECTS</span></div>
                    <div className="h2">相关项目</div>
                    <p className="lead">同类型项目推荐。</p>
                  </div>
                </div>
                <div className="grid">
                  {related.map((item) => (
                    <a
                      className="card reveal is-visible"
                      href={`/projects/${encodeURIComponent(item.id)}`}
                      key={item.id}
                      style={{ gridColumn: 'span 4', display: 'block' }}
                    >
                      <div style={{ height: 160, overflow: 'hidden' }}>
                        <img src={item.image || fallbackProjectImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div className="card-pad">
                        {item.type ? <div className="pill">{item.type}</div> : null}
                        <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 16 }}>{item.name}</div>
                        <div className="meta" style={{ marginTop: 10 }}>{item.location || '—'}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
