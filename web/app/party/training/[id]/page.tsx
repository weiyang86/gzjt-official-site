import { notFound } from 'next/navigation';
import { Drawer, Footer, Header, NewsAssets } from '../../../news/components';
import { getPublicTrainingResourceById } from '@/lib/cms';

export const dynamic = 'force-dynamic';

type TrainingArticlePageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrainingArticlePage({ params }: TrainingArticlePageProps) {
  const { id } = await params;
  const resource = await getPublicTrainingResourceById(id).catch(() => null);
  if (!resource || resource.kind !== 'article') notFound();

  return (
    <>
      <NewsAssets />
      <Header active="partyMasses" />
      <Drawer active="partyMasses" />
      <main className="page" aria-label={resource.title}>
        <div className="breadcrumb" aria-label="面包屑导航">
          <div className="content">
            <div className="crumb-inner">
              <a href="/home" data-no-transition>首页</a>
              <span className="crumb-sep">›</span>
              <a href="/party/training">培训资源</a>
              <span className="crumb-sep">›</span>
              <span>{resource.title}</span>
            </div>
          </div>
        </div>
        <section className="section" aria-label="培训文章详情">
          <div className="content">
            <div className="detail reveal is-visible">
              <div className="pill">培训文章</div>
              <h1>{resource.title}</h1>
              {resource.dateLabel ? <div className="meta">{resource.dateLabel}</div> : null}
              {resource.image ? <img src={resource.image} alt={resource.title} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} /> : null}
              <div className="body" style={{ whiteSpace: 'pre-wrap' }}>
                {resource.content.trim() || '培训文章正文暂未发布，敬请关注。'}
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btn--primary" href="/party/training">返回培训资源</a>
                <a className="btn" href="/news?channel=party-mass">返回党建群团</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
