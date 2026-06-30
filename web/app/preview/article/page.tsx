import { notFound } from 'next/navigation';
import { getPreviewArticleById } from '@/lib/cms';
import { isNoticeChannel } from '@/lib/cms/channels';
import { verifyArticlePreviewAccess, type PreviewScope } from '@/lib/preview/article-preview';
import { Drawer, Footer, Header, NewsAssets } from '@/app/news/components';
import type { Article } from '@/types/cms';

export const dynamic = 'force-dynamic';

type PreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

function getArticleScope(article: Article): PreviewScope {
  const channel = article.mainChannel || article.main_channel;
  return channel && isNoticeChannel(channel) ? 'notice' : 'news';
}

function labelFor(article: Article) {
  const channel = article.mainChannel || article.main_channel;
  const scope = getArticleScope(article);
  const defaultLabel = scope === 'notice' ? '公示公告' : '新闻中心';
  return article.newsSubcategory ? `${channel?.name || defaultLabel} · ${article.newsSubcategory}` : channel?.name || defaultLabel;
}

export default async function PublicArticlePreviewPage({ searchParams }: PreviewPageProps) {
  const params = await searchParams;
  const id = getFirst(params.id) || '';
  const scope = getFirst(params.scope) === 'notice' ? 'notice' : 'news';
  const expiresAt = Number.parseInt(getFirst(params.exp) || '', 10);
  const signature = getFirst(params.sig) || '';

  if (!verifyArticlePreviewAccess(id, scope, expiresAt, signature)) {
    notFound();
  }

  const article = await getPreviewArticleById(id);
  if (!article) notFound();

  const actualScope = getArticleScope(article);
  if (actualScope !== scope) notFound();

  const publishValue = article.publishAt || article.publishDate;
  const sectionLabel = actualScope === 'notice' ? '公示公告' : '新闻中心';
  const activeNav = actualScope === 'notice' ? 'disclosure' : 'news';

  return (
    <>
      <NewsAssets />
      <Header active={activeNav} />
      <Drawer active={activeNav} />
      <div className="breadcrumb" aria-label="面包屑导航">
        <div className="content">
          <div className="crumb-inner">
            <a href="/" data-no-transition>首页</a>
            <span className="crumb-sep">›</span>
            <span>{sectionLabel}</span>
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
              <div className="meta">
                发布时间：{formatDate(publishValue)} · {labelFor(article)}
                {article.source ? ` · ${article.source}` : ''}
                {article.status && article.status !== 'published' ? ` · 预览状态：${article.status}` : ''}
              </div>
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
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
