import { notFound } from 'next/navigation';
import { getPublicRecruitmentJobById } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from '../../news/components';

export const dynamic = 'force-dynamic';

type RecruitmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

const categoryLabels = {
  social: '社会招聘',
  campus: '校园招聘',
  internal: '内部选聘',
} as const;

const toApplyHref = (value: string) => {
  const target = value.trim();
  if (!target) return '';
  if (/^https?:\/\//i.test(target)) return target;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return `mailto:${target}`;
  return '';
};

export default async function RecruitmentDetailPage({ params }: RecruitmentDetailPageProps) {
  const { id } = await params;
  const job = await getPublicRecruitmentJobById(id).catch(() => null);
  if (!job) notFound();

  const meta = [
    job.department ? `部门：${job.department}` : '',
    job.headcount ? `招聘人数：${job.headcount}` : '',
    job.location ? `工作地点：${job.location}` : '',
    job.deadline ? `有效期：${job.deadline}` : '',
  ].filter(Boolean).join(' · ');
  const applyHref = toApplyHref(job.applyUrl);

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
            <a href="/recruitment" data-no-transition>人才招聘</a>
            <span className="crumb-sep">›</span>
            <span>岗位详情</span>
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容" data-detail="recruitment">
        <section className="section" aria-label="岗位详情">
          <div className="content">
            <div className="detail reveal is-visible">
              <div className="pill">{categoryLabels[job.category]}</div>
              <h1 style={{ marginTop: 14 }}>{job.title}</h1>
              {meta ? <div className="meta" style={{ marginTop: 12 }}>{meta}</div> : null}
              <div className="section-head reveal is-visible" style={{ marginTop: 26 }}>
                <div>
                  <div className="kicker"><i aria-hidden="true" /><span>REQUIREMENTS</span></div>
                  <div className="h2">岗位要求</div>
                </div>
              </div>
              {job.requirement ? (
                <div className="body" dangerouslySetInnerHTML={{ __html: job.requirement }} />
              ) : (
                <div className="body"><p>暂无岗位要求说明。</p></div>
              )}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(11,18,32,.10)' }}>
                <div className="meta">报名方式</div>
                {job.applyUrl ? (
                  applyHref ? (
                    <a
                      className="btn btn--primary"
                      href={applyHref}
                      style={{ marginTop: 12 }}
                      target={applyHref.startsWith('http') ? '_blank' : undefined}
                      rel={applyHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      立即报名
                    </a>
                  ) : (
                    <p className="lead" style={{ marginTop: 10 }}>{job.applyUrl}</p>
                  )
                ) : (
                  <p className="lead" style={{ marginTop: 10 }}>报名地址暂未配置，请通过联系我们页面咨询。</p>
                )}
              </div>
              <div style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn" href="/recruitment">返回岗位列表</a>
                <a className="btn" href="/contact-us">联系我们</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
