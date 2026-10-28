'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import { LeadershipPortrait } from '@/app/group/leadership/LeadershipPortrait';
import type { MessageState, PageContentItem, UploadPayload } from './types';

const moduleCode = 'leaders';
const emptyLeader = (): PageContentItem => ({
  id: '', module_code: moduleCode, item_type: 'leader', title: '', subtitle: '', image: null,
  content: '', sort: 0, status: 'enabled', extra_json: {},
});
const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function LeadershipManager() {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(emptyLeader);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode, item_type: 'leader' });
      setItems((result.data || []) as PageContentItem[]);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '领导致辞列表加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const setField = (field: keyof PageContentItem, value: string | number | null) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ text: '照片仅支持 JPG、PNG、WEBP 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ text: '照片大小不能超过 50MB。', type: 'error' });
      input.value = '';
      return;
    }
    setIsUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await AdminApi.uploadFile(body);
      const payload = (result.data || {}) as UploadPayload;
      if (!payload.id) throw new Error('照片上传成功但未返回文件 ID。');
      setField('image', payload.id);
      setMessage({ text: '照片已上传，保存致辞后生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '照片上传失败，请确认文件服务和当前账号权限。', type: 'error' });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!String(form.title || '').trim() || !String(form.subtitle || '').trim()) {
      setMessage({ text: '请填写领导姓名和职务。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      module_code: moduleCode,
      item_type: 'leader',
      title: String(form.title || '').trim(),
      subtitle: String(form.subtitle || '').trim(),
      image: form.image || null,
      content: String(form.content || ''),
      sort: Number(form.sort || 0),
      status: form.status || 'enabled',
      extra_json: form.extra_json || {},
    };
    try {
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: '领导致辞已保存。', type: 'success' });
      setForm(emptyLeader());
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存领导致辞失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (item: PageContentItem) => {
    setForm({ ...emptyLeader(), ...item, id: item.id, sort: Number(item.sort || 0), status: item.status || 'enabled' });
    setMessage(null);
  };

  const disable = async (id: string) => {
    if (!window.confirm('确认停用这条领导致辞？停用后将不再显示在前台。')) return;
    setMessage(null);
    try {
      await AdminApi.disablePageContentItem(id);
      setMessage({ text: '该致辞已停用。', type: 'success' });
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '停用失败，请稍后重试。', type: 'error' });
    }
  };

  const removeItem = async (item: PageContentItem) => {
    if (!item.id) return;
    if (!window.confirm(`确认删除“${item.title || '该领导致辞'}”？删除后不可恢复，只想在前台隐藏请改用停用。`)) return;
    setMessage(null);
    try {
      await AdminApi.deletePageContentItem(item.id);
      if (form.id === item.id) setForm(emptyLeader());
      setMessage({ text: '领导致辞已删除。', type: 'success' });
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '删除失败，请稍后重试。', type: 'error' });
    }
  };

  return (
    <div className="leadership-admin">
      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">page_content_items · leader</p><h2>{form.id ? '编辑领导致辞' : '新增领导致辞'}</h2></div>
          {form.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">姓名、职务、照片、致辞正文和排序保存在现有领导列表条目中；前台只展示启用内容。</p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()} role={message.type === 'error' ? 'alert' : undefined}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={save}>
          <label>姓名<input required maxLength={255} value={form.title || ''} onChange={(event) => setField('title', event.target.value)} /></label>
          <label>职务<input required maxLength={255} value={form.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} /></label>
          <div className="span-2 leadership-photo-field">
            <label htmlFor="leadership-photo">领导照片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB。上传使用现有文件接口。</p>
            <input id="leadership-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={isUploading} />
            {form.image ? <LeadershipPortrait className="leadership-admin-photo" src={`/admin-api/assets/${encodeURIComponent(String(form.image))}`} name={String(form.title || '领导')} /> : null}
          </div>
          <label>排序<input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
          <label>状态<select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <label className="span-2">致辞正文<textarea rows={8} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} /></label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploading}>{isSaving ? '正在保存…' : '保存致辞'}</button>
            {form.id ? <button className="secondary-button" type="button" disabled={isSaving} onClick={() => { setForm(emptyLeader()); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="table-card leadership-list-card">
        <div className="section-title-row"><div><p className="eyebrow">GROUP LEADERSHIP</p><h2>领导致辞列表</h2></div><span className="leadership-list-count">共 {items.length} 条</span></div>
        {isLoading ? <p className="muted-text">正在加载领导致辞…</p> : items.length ? <div className="leadership-admin-list">{items.map((item) => (
          <article className="timeline-item-card leadership-admin-item" key={item.id}>
            <LeadershipPortrait className="leadership-admin-list-photo" src={item.image ? `/admin-api/assets/${encodeURIComponent(String(item.image))}` : ''} name={String(item.title || '领导')} />
            <div className="leadership-admin-item-copy">
              <div className="leadership-admin-item-heading"><div><h3>{item.title}</h3><strong>{item.subtitle || '未填写职务'}</strong></div><span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span></div>
              <p>{plainText(String(item.content || '')) || '暂无致辞正文。'}</p>
              <small>排序：{Number(item.sort || 0)}</small>
            </div>
            <div className="table-actions leadership-admin-actions">
              <button className="text-button" type="button" onClick={() => edit(item)}>编辑</button>
              {item.status === 'enabled' ? <button className="text-button is-danger" type="button" onClick={() => void disable(item.id)}>停用</button> : null}
              <button className="text-button is-danger" type="button" onClick={() => void removeItem(item)}>删除</button>
            </div>
          </article>
        ))}</div> : <div className="navigation-empty"><span>✦</span><strong>暂无领导致辞</strong><small>新增并启用后，内容会显示在官网领导致辞页面。</small></div>}
      </section>
    </div>
  );
}
