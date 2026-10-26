import { getPublicDownloads } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from '../../news/components';

export const dynamic = 'force-dynamic';

const formatSize = (size: number) => {
  if (!size || size <= 0) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

export default async function DownloadsPage() {
  const { content, items } = await getPublicDownloads();

  return (
    <>
      <NewsAssets />
      <Header active="disclosure" />
      <Drawer active="disclosure" />

      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>信息公开</span>
            <span className="crumb-sep">›</span>
            <span>资料下载</span>
          </div>
        </div>
      </div>

      <main className="page" aria-label="资料下载">
        <section className="hero">
          <div className="hero-bg"><img alt="" src="/img/雅砻江大桥.jpg" /></div>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="content hero-inner">
            <div>
              <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>DOWNLOADS</span></div>
              <h1 className="hero-title reveal is-visible">{content?.title || '资料下载'}</h1>
              <p className="hero-sub reveal is-visible">{content?.subtitle || '集中提供集团公开制度、办事表格与常用资料下载。'}</p>
            </div>
            <div className="glass reveal is-visible" aria-label="下载速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{items.length}</b><span>可用资料</span></div>
                <div className="kpi"><b>公开</b><span>获取方式</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="content" aria-label="资料列表">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>DOCUMENTS</span></div>
                <div className="h2">资料下载</div>
                {content?.summary ? <p className="lead">{content.summary}</p> : null}
              </div>
            </div>

            {items.length ? (
              <div className="grid">
                {items.map((item) => (
                  <article className="card reveal is-visible" key={item.id} style={{ gridColumn: 'span 4' }}>
                    <div className="card-pad">
                      <div className="pill">{item.category}</div>
                      <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{item.title}</div>
                      <div className="rich" style={{ marginTop: 8 }}>
                        {[item.date, formatSize(item.filesize)].filter(Boolean).join(' · ') || '资料文件'}
                      </div>
                      {item.url ? (
                        <a className="btn btn--primary" href={item.url} style={{ marginTop: 16 }}>
                          下载文件
                        </a>
                      ) : (
                        <p className="lead" style={{ marginTop: 16 }}>文件暂不可用，请稍后重试。</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="lead">暂无可下载资料，请稍后再来查看。</p>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
