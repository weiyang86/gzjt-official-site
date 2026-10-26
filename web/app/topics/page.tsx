import { getPublicTopics } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from '../news/components';
import { TopicCover } from './topic-cover';
import type { Topic } from '@/types/cms';

export const dynamic = 'force-dynamic';

const fallbackCover = '/img/雅砻江大桥.jpg';

async function loadTopics() {
  try {
    return { topics: await getPublicTopics(), failed: false };
  } catch {
    return { topics: [] as Topic[], failed: true };
  }
}

export default async function TopicsIndexPage() {
  const { topics, failed } = await loadTopics();

  return (
    <>
      <NewsAssets />
      <Header active="topics" />
      <Drawer active="topics" />
      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/home" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>专题专栏</span>
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容">
        <section className="hero">
          <div className="hero-bg"><img alt="" src={fallbackCover} /></div>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="content hero-inner">
            <div>
              <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>SPECIAL TOPICS</span></div>
              <h1 className="hero-title reveal is-visible">专题专栏</h1>
              <p className="hero-sub reveal is-visible">围绕集团重点工作与重大主题，聚合相关新闻、公告与专题内容。</p>
              <div className="hero-cta reveal is-visible">
                <a className="btn btn--primary" href="#content" data-no-transition>浏览专题</a>
                <a className="btn" href="/news">新闻中心</a>
              </div>
            </div>
            <div className="glass reveal is-visible" aria-label="专题速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{topics.length}</b><span>已发布专题</span></div>
                <div className="kpi"><b>{topics.reduce((total, item) => total + Number(item.articleCount || 0), 0)}</b><span>聚合文章</span></div>
                <div className="kpi"><b>公开</b><span>信息发布</span></div>
                <div className="kpi"><b>持续</b><span>更新维护</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="content" aria-label="专题列表">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>TOPIC COLLECTION</span></div>
                <div className="h2">专题聚合</div>
                <p className="lead">每个专题集中展示一个主题下的多篇内容，点击进入查看完整聚合页。</p>
              </div>
            </div>

            {failed ? (
              <div className="detail reveal is-visible">
                <div className="body"><p>专题内容暂时无法加载，请稍后重试。</p></div>
              </div>
            ) : topics.length ? (
              <div className="grid">
                {topics.map((topic) => (
                  <a
                    className="card reveal is-visible"
                    href={`/topics/${encodeURIComponent(topic.slug)}`}
                    key={topic.id}
                    style={{ gridColumn: 'span 4', display: 'block' }}
                  >
                    <div style={{ height: 180, overflow: 'hidden' }}>
                      <TopicCover
                        src={topic.cover}
                        fallback={fallbackCover}
                        alt={topic.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="card-pad">
                      <div className="pill">专题</div>
                      <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 }}>{topic.title}</div>
                      <div className="rich" style={{ marginTop: 8 }}>{topic.summary || topic.subtitle || '查看该专题的聚合内容。'}</div>
                      <div className="meta" style={{ marginTop: 12 }}>{Number(topic.articleCount || 0)} 篇内容</div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="detail reveal is-visible">
                <div className="body"><p>暂无已发布专题，请先在后台创建专题并发布。</p></div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
