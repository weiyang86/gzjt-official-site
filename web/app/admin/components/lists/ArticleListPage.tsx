'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { AdminScope, ArticleRow, Channel, MessageState } from './types';
import { formatPreviewDate, getCoverId, normalizePreviewArticle, type PreviewArticle } from './article-preview';

const statusText: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' };
const channelNames = (channels?: Channel[], fallback?: Channel) => {
  const values = channels?.length ? channels : fallback ? [fallback] : [];
  return values.map((channel) => channel.name || channel.slug || channel.id).filter(Boolean).join('、') || '-';
};

export function ArticleListPage({
  scope,
  fixedChannel = '',
  title = '',
  embedded = false,
}: {
  scope: AdminScope;
  fixedChannel?: string;
  title?: string;
  embedded?: boolean;
}) {
  const isNotice = scope === 'notice';
  const [keyword, setKeyword] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [rankingId, setRankingId] = useState('');
  const [previewLoadingId, setPreviewLoadingId] = useState('');
  const [previewItem, setPreviewItem] = useState<PreviewArticle | null>(null);
  const [previewShareUrl, setPreviewShareUrl] = useState('');
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const copy = useMemo(() => {
    const createBase = isNotice ? '/admin/notice-edit' : '/admin/article-edit';
    const channelQuery = fixedChannel ? `channel=${encodeURIComponent(fixedChannel)}` : '';
    const withChannel = (query: string) => [query, channelQuery].filter(Boolean).join('&');
    return {
      title: fixedChannel ? (title ? `${title}管理` : '栏目文章管理') : isNotice ? '公示公告管理' : '新闻管理',
      eyebrow: fixedChannel ? 'Responsibility Articles' : isNotice ? 'Notice Articles' : 'Articles',
      heading: fixedChannel ? `${title || '栏目'}文章列表` : isNotice ? '公示公告列表' : '新闻列表',
      empty: fixedChannel
        ? `暂无${title || '栏目'}文章，请点击“新增文章”创建。`
        : isNotice ? '暂无公示公告，请点击“新增公示公告”创建。' : '暂无新闻，请点击“新增新闻”创建。',
      loading: isNotice ? '正在加载公示公告...' : '正在加载...',
      error: isNotice ? '公示公告列表加载失败' : '新闻列表加载失败',
      createLabel: fixedChannel ? '新增文章' : isNotice ? '新增公示公告' : '新增新闻',
      createHref: channelQuery ? `${createBase}?${channelQuery}` : createBase,
      categoriesHref: isNotice ? '/admin/notice-categories' : '/admin/categories',
      editHref: (id: string) => `${createBase}?${withChannel(`id=${encodeURIComponent(id)}`)}`,
      confirmArchive: isNotice ? '确认归档这条公示公告？' : '确认归档这条新闻？',
      confirmStatus: isNotice ? '确认修改公示公告状态？' : '确认修改新闻状态？',
      confirmDelete: isNotice ? '确认删除这条公示公告？删除后不可恢复。' : '确认删除这条新闻？删除后不可恢复。',
      deleteSuccess: isNotice ? '公示公告已删除。' : '新闻已删除。',
      previewDialogTitle: isNotice ? '公示公告预览' : '新闻预览',
      previewLoading: isNotice ? '正在加载公示公告预览...' : '正在加载新闻预览...',
      previewEmpty: isNotice ? '暂无可预览内容。' : '暂无可预览内容。',
      previewNotFound: isNotice ? '未找到该公告或当前账号无权限查看。' : '未找到该新闻或当前账号无权限查看。',
      openPreviewLink: isNotice ? '打开游客预览页' : '打开游客预览页',
    };
  }, [isNotice, fixedChannel, title]);

  const loadChannels = async () => {
    const result = await AdminApi.channels({ scope });
    setChannels((result.data || []) as Channel[]);
  };

  const loadArticles = async (nextPage = page, nextChannel = channel) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await AdminApi.articles({
        scope,
        keyword: keyword.trim(),
        channel: nextChannel,
        status,
        page: nextPage,
        limit,
      });
      const payload = result as { data?: ArticleRow[]; meta?: { filter_count?: number } };
      const rows = payload.data || [];
      setItems(rows);
      setTotal(Number(payload.meta?.filter_count ?? rows.length));
      setPage(nextPage);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : copy.error, type: 'error' });
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 支持从页面模块管理跳转后直接选中新闻栏目。
    // 若以后恢复党建群团、业务动态独立页，仍可保留这项通用的 URL 筛选能力。
    // 固定栏目模式（社会责任子栏目）直接锁定栏目，不再读取 URL 中的 channel。
    const initialChannel = fixedChannel || new URLSearchParams(window.location.search).get('channel') || '';
    setChannel(initialChannel);
    const boot = fixedChannel ? Promise.resolve() : loadChannels();
    boot
      .then(() => loadArticles(1, initialChannel))
      .catch((err) => setMessage({ text: err instanceof Error ? err.message : '页面初始化失败', type: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, fixedChannel]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    loadArticles(1);
  };

  const handleStatus = async (id: string, action: 'publish' | 'draft' | 'archive') => {
    const prompt = action === 'archive' ? copy.confirmArchive : copy.confirmStatus;
    if (!window.confirm(prompt)) return;
    try {
      await AdminApi.setArticleStatus(id, action, { scope });
      setMessage({ text: '状态已更新。', type: 'success' });
      await loadArticles(page);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '状态更新失败', type: 'error' });
    }
  };

  const handleHomeRank = async (id: string, payload: { is_top?: boolean; sort?: number }) => {
    setRankingId(id);
    try {
      await AdminApi.setArticleHomeRank(id, payload);
      await loadArticles(page);
      setMessage({ text: '首页置顶与排序已更新。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '首页排名更新失败', type: 'error' });
    } finally {
      setRankingId('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(copy.confirmDelete)) return;
    setDeletingId(id);
    try {
      await AdminApi.deleteArticle(id, { scope });
      setMessage({ text: copy.deleteSuccess, type: 'success' });
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      await loadArticles(nextPage);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '删除失败', type: 'error' });
    } finally {
      setDeletingId('');
    }
  };

  const handleOpenPreview = async (id: string) => {
    setPreviewLoadingId(id);
    setMessage(null);
    setPreviewItem(null);
    setPreviewShareUrl('');
    try {
      const articleResult = await AdminApi.article(id, { scope });
      const nextPreviewItem = normalizePreviewArticle(articleResult.data);
      if (!nextPreviewItem) throw new Error(copy.previewNotFound);
      setPreviewItem(nextPreviewItem);
      AdminApi.articlePreviewLink(id)
        .then((previewLinkResult) => setPreviewShareUrl(previewLinkResult.data?.url || ''))
        .catch(() => setPreviewShareUrl(''));
    } catch (err) {
      const messageText = err instanceof Error && err.message && !err.message.includes('Article not found in current scope')
        ? err.message
        : copy.previewNotFound;
      setMessage({ text: messageText, type: 'error' });
    } finally {
      setPreviewLoadingId('');
    }
  };

  const previewCoverId = getCoverId(previewItem?.cover);
  const previewHref = previewShareUrl
    ? (typeof window === 'undefined' ? previewShareUrl : new URL(previewShareUrl, window.location.origin).toString())
    : '';
  const RootTag = embedded ? 'div' : 'main';

  return (
    <RootTag className={embedded ? 'article-list-embedded' : 'dashboard-content'}>
      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">筛选查询</p>
            <h2>{copy.heading}</h2>
          </div>
          <div className="toolbar-actions">
            <a className="secondary-button" href={copy.categoriesHref}>分类管理</a>
            {embedded ? null : <a className="secondary-button" href="/admin/content">页面内容管理</a>}
            <a className="primary-link-button" href={copy.createHref}>{copy.createLabel}</a>
          </div>
        </div>
        <form className="filter-form" onSubmit={handleSubmit}>
          <label>标题搜索
            <input name="keyword" type="search" placeholder="输入标题关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          {fixedChannel ? null : (
            <label>栏目
              <select name="channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="">全部栏目</option>
                {channels.map((item) => <option value={item.slug || ''} key={item.id || item.slug}>{item.name || item.slug}</option>)}
              </select>
            </label>
          )}
          <label>状态
            <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">全部状态</option>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </label>
          <button className="secondary-button" type="submit">查询</button>
        </form>
      </section>

      <section className="table-card" aria-live="polite">
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>封面</th>
                <th>标题</th>
                <th>栏目</th>
                <th>状态</th>
                <th>发布时间</th>
                {isNotice ? null : <th>首页排名</th>}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isNotice ? 6 : 7}>{copy.loading}</td></tr>
              ) : items.length ? items.map((item) => {
                const coverId = getCoverId(item.cover);
                return (
                  <tr key={item.id}>
                    <td>{coverId ? <img className="article-cover-thumb" src={`/admin-api/assets/${encodeURIComponent(coverId)}`} alt="封面图" /> : '-'}</td>
                    <td>
                      <button
                        className="table-title-button"
                        type="button"
                        onClick={() => handleOpenPreview(item.id)}
                        disabled={previewLoadingId === item.id}
                      >
                        {previewLoadingId === item.id ? copy.previewLoading : item.title || (isNotice ? '未命名公示公告' : '未命名新闻')}
                      </button>
                    </td>
                    <td>{channelNames(item.main_channels, item.main_channel)}</td>
                    <td><span className={`status-badge status-${item.status || 'draft'}`}>{statusText[item.status || ''] || item.status || '-'}</span></td>
                    <td>{formatPreviewDate(item.publish_at)}</td>
                    {isNotice ? null : (
                      <td>
                        <div className="table-actions article-home-rank">
                          <button
                            className="text-button"
                            type="button"
                            disabled={rankingId === item.id}
                            onClick={() => void handleHomeRank(item.id, { is_top: !item.is_top })}
                          >
                            {item.is_top ? '取消置顶' : '置顶'}
                          </button>
                          <input
                            aria-label="首页排序，数字越小越靠前，0 表示按发布时间"
                            type="number"
                            min={0}
                            step={1}
                            value={String(item.sort ?? 0)}
                            disabled={rankingId === item.id}
                            onChange={(event) => {
                              const sort = Number(event.target.value) || 0;
                              setItems((current) => current.map((row) => row.id === item.id ? { ...row, sort } : row));
                            }}
                            onBlur={() => void handleHomeRank(item.id, { sort: Number(item.sort) || 0 })}
                          />
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="table-actions">
                        <button className="text-button" type="button" onClick={() => handleOpenPreview(item.id)} disabled={previewLoadingId === item.id}>
                          {previewLoadingId === item.id ? '预览中...' : '预览'}
                        </button>
                        <a className="text-link" href={copy.editHref(item.id)}>编辑</a>
                        {item.status !== 'published' ? <button className="text-button" type="button" onClick={() => handleStatus(item.id, 'publish')}>发布</button> : null}
                        {item.status !== 'draft' ? <button className="text-button" type="button" onClick={() => handleStatus(item.id, 'draft')}>转草稿</button> : null}
                        {item.status !== 'archived' ? <button className="text-button" type="button" onClick={() => handleStatus(item.id, 'archive')}>归档</button> : null}
                        <button className="text-button" type="button" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}>
                          {deletingId === item.id ? '删除中...' : '删除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={isNotice ? 6 : 7}>{copy.empty}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <button className="secondary-button" type="button" disabled={page <= 1 || isLoading} onClick={() => loadArticles(Math.max(1, page - 1))}>上一页</button>
          <span>第 {page} / {totalPages} 页，共 {total} 条</span>
          <button className="secondary-button" type="button" disabled={page >= totalPages || isLoading} onClick={() => loadArticles(Math.min(totalPages, page + 1))}>下一页</button>
        </div>
      </section>

      {previewItem ? (
        <dialog className="admin-dialog article-preview-dialog" open>
          <div className="dialog-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">{copy.previewDialogTitle}</p>
                <h2>{previewItem.title || copy.previewEmpty}</h2>
              </div>
              <div className="toolbar-actions">
                {previewHref ? <a className="secondary-button" href={previewHref} target="_blank" rel="noreferrer">{copy.openPreviewLink}</a> : null}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setPreviewItem(null);
                    setPreviewShareUrl('');
                  }}
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="preview-meta-grid">
              <div><span>栏目</span><strong>{channelNames(previewItem.main_channels, previewItem.main_channel)}</strong></div>
              <div><span>状态</span><strong>{statusText[previewItem.status || ''] || previewItem.status || '-'}</strong></div>
              <div><span>发布时间</span><strong>{formatPreviewDate(previewItem.publish_at)}</strong></div>
              <div><span>作者/来源</span><strong>{[previewItem.author, previewItem.source].filter(Boolean).join(' / ') || '-'}</strong></div>
            </div>

            {previewCoverId ? (
              <img
                className="article-preview-cover"
                src={`/admin-api/assets/${encodeURIComponent(previewCoverId)}`}
                alt={previewItem.title || '预览封面'}
              />
            ) : null}

            {previewItem.summary ? <p className="article-preview-summary">{previewItem.summary}</p> : null}

            <div
              className="article-preview-body"
              dangerouslySetInnerHTML={{ __html: previewItem.content || `<p>${previewItem.summary || copy.previewEmpty}</p>` }}
            />

            {previewItem.attachments?.length ? (
              <div className="attachment-list article-preview-attachments">
                {previewItem.attachments.map((attachment, index) => (
                  <div className="attachment-item" key={`${attachment.url || attachment.title || 'attachment'}-${index}`}>
                    <div className="attachment-meta">
                      <strong>{attachment.title || `附件${index + 1}`}</strong>
                      <span className="attachment-name">{attachment.url || '-'}</span>
                    </div>
                    {attachment.url ? <a className="text-link" href={attachment.url} target="_blank" rel="noreferrer">打开附件</a> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </dialog>
      ) : null}
    </RootTag>
  );
}
