import { notFound } from 'next/navigation';
import { getFallbackNewsPayload, fallbackNewsArticles } from '@/lib/cms/fallback-news';
import { getPublicArticleById, getPublicArticles } from '@/lib/cms';
import { isNoticeChannel } from '@/lib/cms/channels';
import { Drawer, Footer, Header, NewsAssets } from '../components';
import type { Article } from '@/types/cms';

export const dynamic = 'force-dynamic';

type DetailPageProps = {
  params: Promise<{ id: string }>;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

async function loadDetail(id: string) {
  try {
    const article = await getPublicArticleById(id);
    if (!article) return null;
    const scope = getArticleScope(article);
    const query = new URLSearchParams({ scope, page: '1', pageSize: '100' });
    const channelSlug = article.mainChannel?.slug || article.main_channel?.slug || '';
    if (channelSlug) query.set('channelSlug', channelSlug);
    const context = await getPublicArticles(query);
    return { article, related: context.items.filter((item) => item.id !== id).slice(0, 3), isFallback: false, scope };
  } catch {
    const article = fallbackNewsArticles.find((item) => item.id === id) || null;
    if (!article) return null;
    const scope = getArticleScope(article);
    const context = getFallbackNewsPayload(new URLSearchParams({ page: '1', pageSize: '100' }));
    return { article, related: context.items.filter((item) => item.id !== id).slice(0, 3), isFallback: true, scope };
  }
}

function getArticleScope(article: Article): 'news' | 'notice' {
  const channel = article.mainChannel || article.main_channel;
  return channel && isNoticeChannel(channel) ? 'notice' : 'news';
}

function labelFor(article: Article) {
  const channel = article.mainChannel || article.main_channel;
  const defaultLabel = getArticleScope(article) === 'notice' ? '公示公告' : '新闻中心';
  return article.newsSubcategory ? `${channel?.name || defaultLabel} · ${article.newsSubcategory}` : channel?.name || defaultLabel;
}

export default async function NewsDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const data = await loadDetail(id);
  if (!data) notFound();

  const { article, related, scope } = data;
  const publishValue = article.publishAt || article.publishDate;
  const sectionLabel = scope === 'notice' ? '公示公告' : '新闻中心';
  const listHref = scope === 'notice' ? '/disclosure' : '/news';
  const relatedLead = scope === 'notice' ? '以卡片形式承接关联公告。' : '以卡片形式承接关联内容。';

  return (
    <>
      <NewsAssets />
      <Header active={scope === 'notice' ? 'disclosure' : 'news'} />
      <Drawer active={scope === 'notice' ? 'disclosure' : 'news'} />
      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <a href={listHref}>{sectionLabel}</a>
            {scope === 'news' ? (
              <>
                <span className="crumb-sep">›</span>
                <span>新闻详情</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <main className="page" aria-label="主要内容" data-detail="news">
        <section className="section" aria-label="正文">
          <div className="content">
            <div className="detail reveal is-visible">
              <div style={{ borderRadius: 24, overflow: 'hidden', height: 260, position: 'relative' }}>
                <img alt="" src={article.cover || '/img/雅砻江大桥.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,18,32,.06),rgba(11,18,32,.62))' }} />
              </div>
              <h1 style={{ marginTop: 18 }}>{article.title}</h1>
              <div className="meta">发布时间：{formatDate(publishValue)} · {labelFor(article)}{article.source ? ` · ${article.source}` : ''}</div>
              <div className="body" dangerouslySetInnerHTML={{ __html: article.content || `<p>${article.summary || '暂无正文内容。'}</p>` }} />
              {article.attachments?.length ? (
                <div className="attachments">
                  {article.attachments.map((item) => (
                    <div className="attach" key={item.url}>
                      <span><b>{item.title}</b><br /><small>{item.url}</small></span>
                      <a className="btn" href={item.url} target="_blank" rel="noreferrer">下载</a>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btn--primary" href={listHref}>返回列表</a>
                <a className="btn" href="/pages/projects/index.html">相关项目</a>
              </div>
            </div>

            <div className="section-head reveal is-visible" style={{ marginTop: 32 }}>
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>RECOMMEND</span></div>
                <div className="h2">相关推荐</div>
                <p className="lead">{relatedLead}</p>
              </div>
            </div>
            <div className="grid">
              {related.map((item) => (
                <a className="card reveal is-visible" href={`/news/${encodeURIComponent(item.id)}`} key={item.id} style={{ gridColumn: 'span 4', display: 'block' }}>
                  <div className="card-pad">
                    <div className="pill">{labelFor(item)}</div>
                    <div style={{ marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 16 }}>{item.title}</div>
                    <div className="meta" style={{ marginTop: 10 }}>{formatDate(item.publishAt || item.publishDate)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
