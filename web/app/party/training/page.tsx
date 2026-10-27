import type { ReactNode } from 'react';
import { Drawer, Footer, Header, NewsAssets } from '../../news/components';
import { getPublicTrainingResources } from '@/lib/cms';
import type { TrainingResource } from '@/types/cms';

export const dynamic = 'force-dynamic';

const formatFileSize = (value: number) => {
  if (!value || value < 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const articleSummary = (item: TrainingResource) => {
  if (item.summary.trim()) return item.summary;
  const text = item.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
};

const resourceCardStyle = { gridColumn: 'span 4', display: 'block' } as const;
const resourceTitleStyle = { marginTop: 12, fontWeight: 950, letterSpacing: '.3px', fontSize: 18 } as const;
const resourceMetaStyle = { marginTop: 12, color: 'rgba(11,18,32,.52)', fontSize: 13 } as const;

function ArticleCards({ items }: { items: TrainingResource[] }) {
  return (
    <div className="grid">
      {items.map((item) => (
        <a className="card reveal is-visible" href={`/party/training/${encodeURIComponent(item.id)}`} key={item.id} style={resourceCardStyle}>
          {item.image ? <div style={{ height: 180, overflow: 'hidden' }}><img src={item.image} alt={item.title} /></div> : null}
          <div className="card-pad">
            <div className="pill">培训文章</div>
            <div style={resourceTitleStyle}>{item.title}</div>
            <div className="rich" style={{ marginTop: 8 }}>{articleSummary(item) || '查看培训文章详情。'}</div>
            {item.dateLabel ? <div style={resourceMetaStyle}>{item.dateLabel}</div> : null}
          </div>
        </a>
      ))}
    </div>
  );
}

function AttachmentCards({ items }: { items: TrainingResource[] }) {
  return (
    <div className="grid">
      {items.map((item) => {
        const available = Boolean(item.url);
        return (
          <div className="card reveal is-visible" key={item.id} style={resourceCardStyle}>
            <div className="card-pad">
              <div className="pill">资料附件</div>
              <div style={resourceTitleStyle}>{item.title}</div>
              {item.summary ? <div className="rich" style={{ marginTop: 8 }}>{item.summary}</div> : null}
              <div style={resourceMetaStyle}>
                {item.fileName ? `文件：${item.fileName}` : '附件文件'}
                {formatFileSize(item.fileSize) ? `（${formatFileSize(item.fileSize)}）` : ''}
                {item.dateLabel ? ` · ${item.dateLabel}` : ''}
              </div>
              {available ? (
                <a className="btn btn--primary" href={item.url} style={{ marginTop: 16 }} download={item.fileName || undefined}>下载附件</a>
              ) : (
                <p style={{ ...resourceMetaStyle, color: '#9a3412' }}>附件暂不可用，请联系网站管理员。</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LinkCards({ items }: { items: TrainingResource[] }) {
  return (
    <div className="grid">
      {items.map((item) => {
        const available = Boolean(item.url);
        return (
          <div className="card reveal is-visible" key={item.id} style={resourceCardStyle}>
            <div className="card-pad">
              <div className="pill">外部学习链接</div>
              <div style={resourceTitleStyle}>{item.title}</div>
              {item.summary ? <div className="rich" style={{ marginTop: 8 }}>{item.summary}</div> : null}
              {item.dateLabel ? <div style={resourceMetaStyle}>{item.dateLabel}</div> : null}
              {available ? (
                <a className="btn btn--primary" href={item.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 16 }}>前往学习</a>
              ) : (
                <p style={{ ...resourceMetaStyle, color: '#9a3412' }}>学习链接无效，请联系网站管理员更新。</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResourceSection({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section className="section" aria-label={title} style={{ paddingTop: 8 }}>
      <div className="section-head reveal is-visible">
        <div>
          <div className="kicker"><i aria-hidden="true" /><span>{kicker}</span></div>
          <div className="h2">{title}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

export default async function TrainingResourcesPage() {
  let resources: TrainingResource[] = [];
  let loadError = false;
  try {
    resources = await getPublicTrainingResources();
  } catch {
    loadError = true;
  }

  const articles = resources.filter((item) => item.kind === 'article');
  const attachments = resources.filter((item) => item.kind === 'attachment');
  const links = resources.filter((item) => item.kind === 'link');

  return (
    <>
      <NewsAssets />
      <Header active="partyMasses" />
      <Drawer active="partyMasses" />
      <main className="page" aria-label="培训资源与学习入口">
        <div className="breadcrumb" aria-label="面包屑导航">
          <div className="content">
            <div className="crumb-inner">
              <a href="/home" data-no-transition>首页</a>
              <span className="crumb-sep">›</span>
              <span>培训资源</span>
            </div>
          </div>
        </div>
        <section className="section" aria-label="培训资源栏目">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>TRAINING RESOURCES</span></div>
                <div className="h2">培训资源与学习入口</div>
                <p className="lead">汇聚培训文章、学习资料与外部学习平台，服务干部职工能力提升和日常学习。</p>
              </div>
              <a className="btn" href="/news?channel=party-mass">返回党建群团</a>
            </div>

            {loadError ? (
              <div className="card" role="status">
                <div className="card-pad">
                  <div className="pill">加载失败</div>
                  <div style={resourceTitleStyle}>培训资源暂时无法加载</div>
                  <p style={{ ...resourceMetaStyle, lineHeight: 1.9 }}>请稍后重试，或联系网站管理员检查内容接口。</p>
                </div>
              </div>
            ) : null}

            {!loadError && !resources.length ? (
              <div className="card" role="status">
                <div className="card-pad">
                  <div className="pill">暂无内容</div>
                  <div style={resourceTitleStyle}>培训资源暂未发布</div>
                  <p style={{ ...resourceMetaStyle, lineHeight: 1.9 }}>网站编辑可在后台“页面内容管理 → 党建群团 → 培训资源”新增并启用培训文章、资料附件或外部学习链接。</p>
                </div>
              </div>
            ) : null}

            {articles.length ? (
              <ResourceSection title="培训文章" kicker="TRAINING ARTICLES">
                <ArticleCards items={articles} />
              </ResourceSection>
            ) : null}

            {attachments.length ? (
              <ResourceSection title="资料附件" kicker="TRAINING MATERIALS">
                <AttachmentCards items={attachments} />
              </ResourceSection>
            ) : null}

            {links.length ? (
              <ResourceSection title="外部学习链接" kicker="LEARNING LINKS">
                <LinkCards items={links} />
              </ResourceSection>
            ) : resources.length && !loadError ? (
              <ResourceSection title="外部学习链接" kicker="LEARNING LINKS">
                <div className="card" role="status">
                  <div className="card-pad">
                    <div className="pill">暂无内容</div>
                    <div style={resourceTitleStyle}>暂无外部学习链接</div>
                    <p style={{ ...resourceMetaStyle, lineHeight: 1.9 }}>网站编辑可在后台“页面内容管理 → 党建群团 → 培训资源”中新增“外部学习链接”并填写学习地址。</p>
                  </div>
                </div>
              </ResourceSection>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
