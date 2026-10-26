import { getPublicRecruitmentJobs } from '@/lib/cms';
import type { RecruitmentCategory, RecruitmentJob } from '@/types/cms';
import { Drawer, Footer, Header, NewsAssets } from '../news/components';

export const dynamic = 'force-dynamic';

const fallbackHeroImage = '/img/雅砻江大桥.jpg';

const categoryOptions: Array<{ value: RecruitmentCategory; label: string }> = [
  { value: 'social', label: '社会招聘' },
  { value: 'campus', label: '校园招聘' },
  { value: 'internal', label: '内部选聘' },
];

const categoryMeta: Record<RecruitmentCategory, { label: string; description: string }> = {
  social: { label: '社会招聘', description: '面向社会公开招聘的专业技术与经营管理岗位。' },
  campus: { label: '校园招聘', description: '面向高校毕业生发布的储备人才与应届岗位。' },
  internal: { label: '内部选聘', description: '面向集团内部公开选聘的岗位。' },
};

const categoryOrder: RecruitmentCategory[] = ['social', 'campus', 'internal'];

const categoryLabel = (value: string) => categoryOptions.find((option) => option.value === value)?.label || '招聘岗位';

type RecruitmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const buildHref = (category: string) => category === 'all' ? '/recruitment' : `/recruitment?type=${encodeURIComponent(category)}`;

function RecruitmentHero({ total, locations, activeLabel }: { total: number; locations: number; activeLabel: string }) {
  return (
    <section className="hero">
      <div className="hero-bg"><img alt="" src={fallbackHeroImage} /></div>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-noise" aria-hidden="true" />
      <div className="content hero-inner">
        <div>
          <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>RECRUITMENT</span></div>
          <h1 className="hero-title reveal is-visible">人才招聘</h1>
          <p className="hero-sub reveal is-visible">发布社会招聘、校园招聘与内部选聘岗位，公开岗位要求、招聘人数、工作地点和报名方式。</p>
          <div className="hero-cta reveal is-visible">
            <a className="btn btn--primary" href="#jobs" data-no-transition>查看岗位</a>
            <a className="btn" href="/contact-us">联系我们</a>
          </div>
        </div>
        <div className="glass reveal is-visible" aria-label="招聘岗位速览">
          <div className="kpi-grid">
            <div className="kpi"><b>{total}</b><span>{activeLabel}</span></div>
            <div className="kpi"><b>{locations || '—'}</b><span>工作地点</span></div>
            <div className="kpi"><b>公开</b><span>招聘方式</span></div>
            <div className="kpi"><b>在线</b><span>岗位发布</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function JobCard({ job }: { job: RecruitmentJob }) {
  const meta = [
    job.department ? `部门：${job.department}` : '',
    job.headcount ? `招聘人数：${job.headcount}` : '',
    job.location ? `工作地点：${job.location}` : '',
    job.deadline ? `有效期：${job.deadline}` : '',
  ].filter(Boolean);

  return (
    <a
      className="card reveal is-visible"
      href={`/recruitment/${encodeURIComponent(job.id)}`}
      style={{ gridColumn: 'span 4', display: 'block' }}
    >
      <div className="card-pad">
        <div className="pill">{categoryLabel(job.category)}</div>
        <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 16, color: 'rgba(11,18,32,.90)', lineHeight: 1.35 }}>{job.title}</div>
        {meta.length ? <div className="meta" style={{ marginTop: 12 }}>{meta.join(' · ')}</div> : null}
        <div className="rich" style={{ marginTop: 10 }}>查看岗位要求与报名方式</div>
      </div>
    </a>
  );
}

function CategorySection({ category, jobs }: { category: RecruitmentCategory; jobs: RecruitmentJob[] }) {
  const meta = categoryMeta[category];
  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-head reveal is-visible">
        <div>
          <div className="kicker"><i aria-hidden="true" /><span>{category.toUpperCase()}</span></div>
          <div className="h2" style={{ fontSize: 26 }}>{meta.label}</div>
          <p className="lead">{meta.description}</p>
        </div>
        <span className="meta">共 {jobs.length} 个岗位</span>
      </div>
      {jobs.length ? (
        <div className="grid" style={{ marginTop: 18 }}>
          {jobs.map((job) => <JobCard job={job} key={job.id} />)}
        </div>
      ) : (
        <div className="detail reveal is-visible">
          <div className="body"><p>暂无{meta.label}岗位，请稍后查看。</p></div>
        </div>
      )}
    </div>
  );
}

export default async function RecruitmentPage({ searchParams }: RecruitmentPageProps) {
  const params = await searchParams;
  const activeType = getFirst(params.type) || 'all';
  const jobs = await getPublicRecruitmentJobs().catch(() => []);
  const visibleJobs = activeType === 'all' ? jobs : jobs.filter((job) => job.category === activeType);
  const locations = new Set(visibleJobs.map((job) => job.location).filter(Boolean)).size;
  const activeLabel = activeType === 'all' ? '在招岗位' : categoryLabel(activeType);
  const counts = {
    social: jobs.filter((job) => job.category === 'social').length,
    campus: jobs.filter((job) => job.category === 'campus').length,
    internal: jobs.filter((job) => job.category === 'internal').length,
  };
  const visibleCategories = activeType === 'all'
    ? categoryOrder.filter((category) => jobs.some((job) => job.category === category))
    : categoryOrder.filter((category) => category === activeType);

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
            <span>人才招聘</span>
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容">
        <RecruitmentHero total={visibleJobs.length} locations={locations} activeLabel={activeLabel} />
        <section className="section" id="jobs" aria-label="招聘岗位列表">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>JOB LIST</span></div>
                <div className="h2">{activeLabel}</div>
                <p className="lead">按社会招聘、校园招聘、内部选聘分类展示，点击岗位卡片查看详细要求与报名方式。</p>
              </div>
            </div>
            <div className="filters reveal is-visible" style={{ justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className={`btn${activeType === 'all' ? ' btn--primary' : ''}`} href={buildHref('all')} data-no-transition>
                  全部（{jobs.length}）
                </a>
                {categoryOrder.map((category) => (
                  <a
                    className={`btn${activeType === category ? ' btn--primary' : ''}`}
                    href={buildHref(category)}
                    key={category}
                    data-no-transition
                  >
                    {categoryMeta[category].label}（{counts[category]}）
                  </a>
                ))}
              </div>
            </div>
            {jobs.length ? (
              visibleCategories.map((category) => (
                <CategorySection
                  category={category}
                  jobs={jobs.filter((job) => job.category === category)}
                  key={category}
                />
              ))
            ) : (
              <div className="detail reveal is-visible" style={{ marginTop: 18 }}>
                <div className="body">
                  <p>暂无招聘岗位，请稍后查看。</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
