import { notFound } from 'next/navigation';
import { getPublicTopicArticles, getPublicTopicBySlug, getPublicTopics } from '@/lib/cms';
import { Drawer, Footer, Header, NewsAssets } from '../../news/components';
import { TopicCover } from '../topic-cover';
import type { Topic, TopicArticle } from '@/types/cms';

export const dynamic = 'force-dynamic';

const fallbackCover = '/img/雅砻江大桥.jpg';

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const dayText = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return String(date.getDate()).padStart(2, '0');
};

const monthText = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
};

async function loadTopicPage(slug: string) {
  let topic: Topic | null = null;
  let failed = false;
  try {
    topic = await getPublicTopicBySlug(slug);
  } catch {
    failed = true;
  }

  if (!topic) return { topic: null, topics: [] as Topic[], articles: [] as TopicArticle[], failed };

  const [topics, articles] = await Promise.all([
    getPublicTopics(false).catch(() => [] as Topic[]),
    getPublicTopicArticles(topic.moduleCode).catch(() => [] as TopicArticle[]),
  ]);
  return { topic, topics, articles, failed: false };
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { topic, topics, articles, failed } = await loadTopicPage(slug);
  if (!topic && !failed) notFound();

  const title = topic?.title || '专题专栏';
  const summary = topic?.summary || topic?.subtitle || '';

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
            <a href="/topics" data-no-transition>专题专栏</a>
            <span className="crumb-sep">›</span>
            <span>{title}</span>
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容">
        <section className="hero">
          <div className="hero-bg"><TopicCover src={topic?.cover} fallback={fallbackCover} alt={title} /></div>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="content hero-inner">
            <div>
              <div className="kicker reveal is-visible"><i aria-hidden="true" /><span>SPECIAL TOPIC</span></div>
              <h1 className="hero-title reveal is-visible">{title}</h1>
              {summary ? <p className="hero-sub reveal is-visible">{summary}</p> : null}
              <div className="hero-cta reveal is-visible">
                <a className="btn btn--primary" href="#articles" data-no-transition>查看聚合内容</a>
                <a className="btn" href="/topics" data-no-transition>全部专题</a>
              </div>
            </div>
            <div className="glass reveal is-visible" aria-label="专题速览">
              <div className="kpi-grid">
                <div className="kpi"><b>{articles.length}</b><span>聚合内容</span></div>
                <div className="kpi"><b>{topics.length}</b><span>专题总数</span></div>
                <div className="kpi"><b>公开</b><span>发布状态</span></div>
                <div className="kpi"><b>聚合</b><span>内容形式</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="articles" aria-label="专题内容">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>TOPIC NAVIGATION</span></div>
                <div className="h2">专题导航</div>
                <p className="lead">切换专题可查看其他主题的聚合内容。</p>
              </div>
            </div>

            {topics.length > 1 ? (
              <div className="tabs" role="tablist" aria-label="专题导航">
                {topics.map((item) => (
                  <a
                    className={`tab${item.slug === topic?.slug ? ' is-active' : ''}`}
                    href={`/topics/${encodeURIComponent(item.slug)}`}
                    key={item.id}
                    data-no-transition
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            ) : null}

            {failed ? (
              <div className="detail reveal is-visible" style={{ marginTop: 24 }}>
                <div className="body"><p>专题内容暂时无法加载，请稍后重试。</p></div>
              </div>
            ) : (
              <>
                {topic?.content ? (
                  <div className="detail reveal is-visible" style={{ marginTop: 24 }}>
                    {/<[a-z][\s\S]*>/i.test(topic.content)
                      ? <div className="body" dangerouslySetInnerHTML={{ __html: topic.content }} />
                      : <div className="body"><p>{topic.content}</p></div>}
                  </div>
                ) : null}

                <div className="news-grid news-grid--list-only" style={{ marginTop: 26 }}>
                  <aside className="news-side reveal is-visible" aria-label="专题文章列表">
                    <div className="news-list">
                      {articles.length ? articles.map((article) => (
                        <a className="news-item reveal is-visible" href={`/news/${encodeURIComponent(article.articleId)}`} key={article.id}>
                          <span className="news-date-tag">
                            <span className="nd-day">{dayText(article.publishAt)}</span>
                            <span className="nd-month">{monthText(article.publishAt)}</span>
                          </span>
                          <span className="thumb"><TopicCover src={article.cover} fallback={fallbackCover} alt="" /></span>
                          <span className="news-content">
                            <b className="news-title">{article.title}</b>
                            <span className="news-desc">{article.summary || '查看该专题下的内容详情。'}</span>
                            <span className="news-meta-row">
                              <span className="news-cat-tag">专题内容</span>
                              <span className="news-views">{formatDate(article.publishAt)}</span>
                            </span>
                          </span>
                        </a>
                      )) : (
                        <div className="card" style={{ padding: '24px 20px', color: 'rgba(11,18,32,.68)' }}>
                          该专题暂未聚合已发布内容。
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
