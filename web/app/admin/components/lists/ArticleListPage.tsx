'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { AdminScope, ArticleRow, Channel, MessageState } from './types';

const statusText: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' };

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

const getCoverId = (cover: ArticleRow['cover']) => {
  if (!cover) return '';
  if (typeof cover === 'object') return cover.id || '';
  return cover;
};

export function ArticleListPage({ scope }: { scope: AdminScope }) {
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
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const copy = useMemo(() => ({
    title: isNotice ? '公示公告管理' : '新闻管理',
    eyebrow: isNotice ? 'Notice Articles' : 'Articles',
    heading: isNotice ? '公示公告列表' : '新闻列表',
    empty: isNotice ? '暂无公示公告，请点击“新增公示公告”创建。' : '暂无新闻，请点击“新增新闻”创建。',
    loading: isNotice ? '正在加载公示公告...' : '正在加载...',
    error: isNotice ? '公示公告列表加载失败' : '新闻列表加载失败',
    createLabel: isNotice ? '新增公示公告' : '新增新闻',
    createHref: isNotice ? '/admin/notice-edit' : '/admin/article-edit',
    categoriesHref: isNotice ? '/admin/notice-categories' : '/admin/categories',
    editHref: (id: string) => isNotice ? `/admin/notice-edit?id=${encodeURIComponent(id)}` : `/admin/article-edit?id=${encodeURIComponent(id)}`,
    confirmArchive: isNotice ? '确认归档这条公示公告？' : '确认归档这条新闻？',
    confirmStatus: isNotice ? '确认修改公示公告状态？' : '确认修改新闻状态？',
  }), [isNotice]);

  const loadChannels = async () => {
    const result = await AdminApi.channels({ scope });
    setChannels((result.data || []) as Channel[]);
  };

  const loadArticles = async (nextPage = page) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await AdminApi.articles({
        scope,
        keyword: keyword.trim(),
        channel,
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
    loadChannels()
      .then(() => loadArticles(1))
      .catch((err) => setMessage({ text: err instanceof Error ? err.message : '页面初始化失败', type: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

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

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">筛选查询</p>
            <h2>{copy.heading}</h2>
          </div>
          <div className="toolbar-actions">
            <a className="secondary-button" href={copy.categoriesHref}>分类管理</a>
            <a className="secondary-button" href="/admin/content">页面内容管理</a>
            <a className="primary-link-button" href={copy.createHref}>{copy.createLabel}</a>
          </div>
        </div>
        <form className="filter-form" onSubmit={handleSubmit}>
          <label>标题搜索
            <input name="keyword" type="search" placeholder="输入标题关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <label>栏目
            <select name="channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="">全部栏目</option>
              {channels.map((item) => <option value={item.slug || ''} key={item.id || item.slug}>{item.name || item.slug}</option>)}
            </select>
          </label>
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6}>{copy.loading}</td></tr>
              ) : items.length ? items.map((item) => {
                const coverId = getCoverId(item.cover);
                return (
                  <tr key={item.id}>
                    <td>{coverId ? <img className="article-cover-thumb" src={`/admin-api/assets/${encodeURIComponent(coverId)}`} alt="封面图" /> : '-'}</td>
                    <td>{item.title || (isNotice ? '未命名公示公告' : '未命名新闻')}</td>
                    <td>{item.main_channel?.name || '-'}</td>
                    <td><span className={`status-badge status-${item.status || 'draft'}`}>{statusText[item.status || ''] || item.status || '-'}</span></td>
                    <td>{formatDate(item.publish_at)}</td>
                    <td>
                      <div className="table-actions">
                        <a className="text-link" href={copy.editHref(item.id)}>编辑</a>
                        {item.status !== 'published' ? <button className="text-button" type="button" onClick={() => handleStatus(item.id, 'publish')}>发布</button> : null}
                        {item.status !== 'draft' ? <button className="text-button" type="button" onClick={() => handleStatus(item.id, 'draft')}>转草稿</button> : null}
                        {item.status !== 'archived' ? <button className="text-button" type="button" onClick={() => handleStatus(item.id, 'archive')}>归档</button> : null}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6}>{copy.empty}</td></tr>
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
    </main>
  );
}
