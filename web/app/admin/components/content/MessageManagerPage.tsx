'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  AdminApi,
  type AdminMessage,
  type AdminMessageCategory,
  type AdminMessageListItem,
  type AdminMessageStatus,
} from '@/lib/admin/admin-api';
import {
  formatMessageDate,
  messageCategoryOptions,
  messageLimits,
  messageStatusOptions,
  messageStatusTone,
} from '@/lib/messages/shared';

type MessageState = { text: string; type: 'success' | 'error' | 'info' } | null;

type Filters = {
  keyword: string;
  status: '' | AdminMessageStatus;
  category: '' | AdminMessageCategory;
};

const emptyFilters: Filters = { keyword: '', status: '', category: '' };
const pageSize = 10;

const statusTone = (status: AdminMessageStatus) => messageStatusTone(status);

export function MessageManagerPage() {
  const [keywordInput, setKeywordInput] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [items, setItems] = useState<AdminMessageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<MessageState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<AdminMessage | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{ status: AdminMessageStatus; reply: string; note: string }>({
    status: 'pending',
    reply: '',
    note: '',
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadMessages = async (nextPage = page, nextFilters = filters) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await AdminApi.messages({
        page: nextPage,
        limit: pageSize,
        keyword: nextFilters.keyword.trim(),
        status: nextFilters.status,
        category: nextFilters.category,
      }) as { data?: AdminMessageListItem[]; meta?: { filter_count?: number } };
      const rows = result.data || [];
      setItems(rows);
      setTotal(Number(result.meta?.filter_count ?? rows.length));
      setPage(nextPage);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setMessage({ text: err instanceof Error ? err.message : '留言列表加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages(1, emptyFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextFilters: Filters = { ...filters, keyword: keywordInput };
    setFilters(nextFilters);
    void loadMessages(1, nextFilters);
  };

  const handleReset = () => {
    setKeywordInput('');
    setFilters(emptyFilters);
    void loadMessages(1, emptyFilters);
  };

  const openDetail = async (id: string) => {
    setDetailLoadingId(id);
    setMessage(null);
    try {
      const result = await AdminApi.message(id);
      if (!result.data) throw new Error('留言不存在或已被移除。');
      setDetail(result.data);
      setForm({
        status: result.data.status,
        reply: result.data.reply,
        note: result.data.note,
      });
      document.getElementById('message-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '留言详情加载失败。', type: 'error' });
    } finally {
      setDetailLoadingId('');
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setForm({ status: 'pending', reply: '', note: '' });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    if (form.status === 'replied' && !form.reply.trim()) {
      setMessage({ text: '状态改为已回复时必须填写公开回复。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await AdminApi.updateMessage(detail.id, {
        status: form.status,
        reply: form.reply,
        note: form.note,
      });
      if (result.data) {
        setDetail(result.data);
        setForm({ status: result.data.status, reply: result.data.reply, note: result.data.note });
      }
      setMessage({ text: '留言处理状态已保存。', type: 'success' });
      await loadMessages(page, filters);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '留言保存失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="page admin-content-page" aria-label="留言管理">
      <section className="editor-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">site-message · 信访与留言</p>
            <h2>留言管理</h2>
          </div>
          <span className="form-help-text">共 {total} 条留言</span>
        </div>
        <p className="form-help-text">
          前台提交的留言保存在 page_contents（module_code = site-message），仅后台可查看完整联系方式与内部备注；前台凭查询码与手机号后四位查询办理状态。
        </p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <form className="filter-form" onSubmit={handleSearch}>
          <label>关键词
            <input
              type="text"
              value={keywordInput}
              placeholder="姓名、手机号、内容或查询码"
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </label>
          <label>处理状态
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as Filters['status'] }))}
            >
              <option value="">全部状态</option>
              {messageStatusOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>留言类型
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as Filters['category'] }))}
            >
              <option value="">全部类型</option>
              {messageCategoryOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="submit">查询</button>
          <button className="secondary-button" type="button" onClick={handleReset}>重置</button>
        </form>
      </section>

      <section className="table-card" aria-live="polite">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>提交时间</th>
                <th>姓名</th>
                <th>手机号</th>
                <th>类型</th>
                <th>留言摘要</th>
                <th>状态</th>
                <th>处理人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8}>正在加载留言...</td></tr>
              ) : items.length ? items.map((item) => (
                <tr key={item.id}>
                  <td>{formatMessageDate(item.created_at)}</td>
                  <td>{item.name || '-'}</td>
                  <td>{item.phone_masked || '-'}</td>
                  <td>{item.category_label}</td>
                  <td title={item.content_excerpt}>{item.content_excerpt || '-'}</td>
                  <td>
                    <span className="status-badge" style={statusTone(item.status)}>{item.status_label}</span>
                  </td>
                  <td>{item.handler || '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => void openDetail(item.id)}
                        disabled={detailLoadingId === item.id}
                      >
                        {detailLoadingId === item.id ? '加载中...' : '查看 / 处理'}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8}>暂无留言。前台提交后会自动出现在这里。</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <button className="secondary-button" type="button" disabled={page <= 1 || isLoading} onClick={() => void loadMessages(Math.max(1, page - 1), filters)}>上一页</button>
          <span>第 {page} / {totalPages} 页，共 {total} 条</span>
          <button className="secondary-button" type="button" disabled={page >= totalPages || isLoading} onClick={() => void loadMessages(Math.min(totalPages, page + 1), filters)}>下一页</button>
        </div>
      </section>

      <section className="editor-card" id="message-detail-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">留言详情与处理</p>
            <h2>{detail ? `${detail.name}的留言` : '请选择一条留言'}</h2>
          </div>
          {detail ? <button className="secondary-button" type="button" onClick={closeDetail}>关闭详情</button> : null}
        </div>
        {detail ? (
          <>
            <div className="preview-meta-grid">
              <div><span>联系电话</span><strong>{detail.phone || '-'}</strong></div>
              <div><span>电子邮箱</span><strong>{detail.email || '-'}</strong></div>
              <div><span>留言类型</span><strong>{detail.category_label}</strong></div>
              <div><span>提交时间</span><strong>{formatMessageDate(detail.created_at)}</strong></div>
              <div><span>查询码</span><strong>{detail.track_code || '-'}</strong></div>
              <div><span>来源页面</span><strong>{detail.source_path || '-'}</strong></div>
              <div><span>提交 IP</span><strong>{detail.client_ip || '-'}</strong></div>
              <div><span>最近处理</span><strong>{detail.handler ? `${detail.handler} · ${formatMessageDate(detail.handled_at)}` : '-'}</strong></div>
            </div>
            <div className="article-preview-body" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{detail.content || '无留言正文。'}</div>
            <form className="editor-grid" onSubmit={handleSave} style={{ marginTop: 18 }}>
              <label>处理状态
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminMessageStatus }))}
                >
                  {messageStatusOptions.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="span-2">
                <label>公开回复（前台凭查询码可见）
                  <textarea
                    rows={5}
                    maxLength={messageLimits.reply}
                    placeholder="状态改为“已回复”时必填，内容会展示给留言人"
                    value={form.reply}
                    onChange={(event) => setForm((current) => ({ ...current, reply: event.target.value }))}
                  />
                </label>
              </div>
              <div className="span-2">
                <label>内部备注（仅后台可见）
                  <textarea
                    rows={3}
                    maxLength={messageLimits.note}
                    placeholder="记录转办部门、联系情况等内部信息"
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>
              </div>
              <div className="form-actions span-2">
                <button className="primary-link-button" type="submit" disabled={isSaving}>
                  {isSaving ? '正在保存...' : '保存处理结果'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="form-help-text">在列表点击“查看 / 处理”后，这里会显示完整留言内容、联系方式和处理表单。</p>
        )}
      </section>
    </main>
  );
}
