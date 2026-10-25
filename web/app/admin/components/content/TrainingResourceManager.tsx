'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContentItem, UploadPayload } from './types';

const moduleCode = 'training-resources';
const kinds = [
  { value: 'article', label: '培训文章' },
  { value: 'attachment', label: '资料附件' },
  { value: 'link', label: '外部学习链接' },
] as const;
const kindLabels: Record<string, string> = {
  article: '培训文章',
  attachment: '资料附件',
  link: '外部学习链接',
};
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const attachmentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const maxUploadBytes = 50 * 1024 * 1024;

type TrainingKind = typeof kinds[number]['value'];

type TrainingUploadPayload = UploadPayload & {
  type?: string;
  filesize?: number;
};

const emptyResource = (): PageContentItem => ({
  id: '',
  module_code: moduleCode,
  item_type: 'article',
  title: '',
  subtitle: '',
  date_label: '',
  image: null,
  content: '',
  link_url: '',
  sort: 0,
  status: 'enabled',
  extra_json: {},
});

const extraOf = (value: PageContentItem['extra_json']): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
};

const textOf = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

const formatFileSize = (value: number) => {
  if (!value || value < 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const validLink = (value: string) => {
  if (!value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const resourcePayload = (item: PageContentItem, overrides: Partial<PageContentItem> = {}) => {
  const next = { ...item, ...overrides };
  const kind = textOf(next.item_type) as TrainingKind;
  const extra = extraOf(next.extra_json);
  return {
    module_code: moduleCode,
    item_type: kind,
    title: textOf(next.title).trim(),
    subtitle: textOf(next.subtitle).trim(),
    date_label: textOf(next.date_label).trim(),
    image: kind === 'article' ? next.image || null : null,
    content: kind === 'article' ? textOf(next.content) : '',
    link_url: kind === 'link' ? textOf(next.link_url).trim() : '',
    sort: Number(next.sort || 0),
    status: next.status || 'enabled',
    extra_json: kind === 'attachment' ? extra : {},
  };
};

export function TrainingResourceManager() {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(emptyResource);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [movingId, setMovingId] = useState('');

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode });
      setItems((result.data || []) as PageContentItem[]);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '培训资源列表加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const setField = (field: keyof PageContentItem, value: string | number | null) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const switchKind = (kind: TrainingKind) => {
    setForm((current) => ({ ...current, item_type: kind }));
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!imageTypes.includes(file.type)) {
      setMessage({ text: '封面图仅支持 JPG、PNG、WEBP 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > maxUploadBytes) {
      setMessage({ text: '封面图大小不能超过 50MB。', type: 'error' });
      input.value = '';
      return;
    }
    setIsUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await AdminApi.uploadFile(body);
      const payload = (result.data || {}) as TrainingUploadPayload;
      if (!payload.id) throw new Error('封面图上传成功但未返回文件 ID。');
      setField('image', payload.id);
      setMessage({ text: '封面图已上传，保存后生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '封面图上传失败，请确认文件服务和当前账号权限。', type: 'error' });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const uploadAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!attachmentExtensions.includes(extension)) {
      setMessage({ text: '资料附件仅支持 PDF、DOC、DOCX、XLS、XLSX 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > maxUploadBytes) {
      setMessage({ text: '资料附件大小不能超过 50MB。', type: 'error' });
      input.value = '';
      return;
    }
    setIsUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await AdminApi.uploadFile(body);
      const payload = (result.data || {}) as TrainingUploadPayload;
      if (!payload.id) throw new Error('附件上传成功但未返回文件 ID。');
      const extra = extraOf(form.extra_json);
      setForm((current) => ({
        ...current,
        extra_json: {
          ...extra,
          file_id: payload.id,
          filename: payload.filename || file.name,
          filesize: payload.filesize || file.size,
          mime_type: payload.type || file.type,
        },
      }));
      setMessage({ text: '附件已上传，保存后前台可下载。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '附件上传失败，请确认文件服务和当前账号权限。', type: 'error' });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const kind = textOf(form.item_type) || 'article';
    const title = textOf(form.title).trim();
    if (!title) {
      setMessage({ text: '请填写资源标题。', type: 'error' });
      return;
    }
    if (kind === 'attachment' && !textOf(extraOf(form.extra_json).file_id)) {
      setMessage({ text: '请先上传资料附件。', type: 'error' });
      return;
    }
    if (kind === 'link' && !validLink(textOf(form.link_url))) {
      setMessage({ text: '请填写有效的 http 或 https 学习链接。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = resourcePayload({ ...form, item_type: kind, title });
    try {
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: form.id ? '培训资源已更新。' : '培训资源已新增。', type: 'success' });
      setForm(emptyResource());
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存培训资源失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (item: PageContentItem) => {
    setForm({ ...emptyResource(), ...item, extra_json: extraOf(item.extra_json), sort: Number(item.sort || 0), status: item.status || 'enabled' });
    setMessage(null);
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    if (nextStatus === 'disabled' && !window.confirm('确认停用这条培训资源？停用后将不再显示在前台。')) return;
    setMessage(null);
    try {
      if (nextStatus === 'disabled') {
        await AdminApi.disablePageContentItem(item.id);
      } else {
        await AdminApi.updatePageContentItem(item.id, resourcePayload(item, { status: 'enabled' }));
      }
      setMessage({ text: nextStatus === 'enabled' ? '该资源已启用。' : '该资源已停用。', type: 'success' });
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '状态更新失败，请稍后重试。', type: 'error' });
    }
  };

  const move = async (item: PageContentItem, offset: number) => {
    const index = items.findIndex((current) => current.id === item.id);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const ordered = [...items];
    const [current] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, current);
    setMovingId(item.id);
    setMessage(null);
    try {
      for (const [position, entry] of ordered.entries()) {
        const sort = (position + 1) * 10;
        if (Number(entry.sort || 0) === sort) continue;
        await AdminApi.updatePageContentItem(entry.id, resourcePayload(entry, { sort }));
      }
      await loadItems();
      setMessage({ text: '排序已更新。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '排序更新失败，请稍后重试。', type: 'error' });
    } finally {
      setMovingId('');
    }
  };

  const extra = extraOf(form.extra_json);
  const kind = textOf(form.item_type) || 'article';

  return (
    <div className="leadership-admin">
      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">page_content_items · training-resources</p><h2>{form.id ? '编辑培训资源' : '新增培训资源'}</h2></div>
          {form.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">培训文章、资料附件和外部学习链接统一保存在页面内容条目中；前台只展示启用的内容，排序按升序展示。</p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()} role={message.type === 'error' ? 'alert' : undefined}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={save}>
          <label>内容类型<select value={kind} onChange={(event) => switchKind(event.target.value as TrainingKind)}>{kinds.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
          <label>标题<input required maxLength={255} value={form.title || ''} onChange={(event) => setField('title', event.target.value)} /></label>
          <label>日期标签<input maxLength={100} placeholder="如 2026-10-25" value={form.date_label || ''} onChange={(event) => setField('date_label', event.target.value)} /></label>
          <label>状态<select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <label className="span-2">摘要<textarea rows={3} maxLength={500} value={form.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} /></label>

          {kind === 'article' ? (
            <>
              <div className="span-2">
                <label htmlFor="training-cover">封面图（可选）</label>
                <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB。</p>
                <input id="training-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={isUploading} />
                {form.image ? <p className="field-tip">已上传封面：{String(form.image)}</p> : null}
              </div>
              <label className="span-2">文章正文<textarea rows={10} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} /></label>
            </>
          ) : null}

          {kind === 'attachment' ? (
            <div className="span-2">
              <label htmlFor="training-attachment">资料附件</label>
              <p className="field-tip">支持 PDF、DOC、DOCX、XLS、XLSX，单个文件不超过 50MB。上传后保存，前台提供下载。</p>
              <input id="training-attachment" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={uploadAttachment} disabled={isUploading} />
              {extra.file_id ? (
                <p className="field-tip">当前附件：{textOf(extra.filename) || String(extra.file_id)} {formatFileSize(Number(extra.filesize) || 0) ? `（${formatFileSize(Number(extra.filesize) || 0)}）` : ''}</p>
              ) : null}
            </div>
          ) : null}

          {kind === 'link' ? (
            <label className="span-2">学习链接<input maxLength={2000} placeholder="https://" value={form.link_url || ''} onChange={(event) => setField('link_url', event.target.value)} /></label>
          ) : null}

          <label>排序<input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
          <div className="form-actions">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploading}>{isSaving ? '正在保存…' : form.id ? '保存修改' : '新增资源'}</button>
            {form.id ? <button className="secondary-button" type="button" disabled={isSaving} onClick={() => { setForm(emptyResource()); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="table-card leadership-list-card">
        <div className="section-title-row"><div><p className="eyebrow">TRAINING RESOURCES</p><h2>培训资源列表</h2></div><span className="leadership-list-count">共 {items.length} 条</span></div>
        {isLoading ? <p className="muted-text">正在加载培训资源…</p> : items.length ? <div className="leadership-admin-list">{items.map((item, index) => {
          const itemKind = textOf(item.item_type);
          const itemExtra = extraOf(item.extra_json);
          return (
            <article className="timeline-item-card leadership-admin-item" key={item.id}>
              <div className="leadership-admin-item-copy">
                <div className="leadership-admin-item-heading">
                  <div>
                    <h3>{item.title}</h3>
                    <strong>{kindLabels[itemKind] || itemKind}{item.date_label ? ` · ${item.date_label}` : ''}</strong>
                  </div>
                  <span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span>
                </div>
                <p>{textOf(item.subtitle) || (itemKind === 'article' ? '培训文章' : itemKind === 'attachment' ? `附件：${textOf(itemExtra.filename) || '未上传'}` : textOf(item.link_url) || '未填写链接')}</p>
                <small>排序：{Number(item.sort || 0)}</small>
              </div>
              <div className="table-actions leadership-admin-actions">
                <button className="text-button" type="button" disabled={movingId !== '' || index === 0} onClick={() => void move(item, -1)}>上移</button>
                <button className="text-button" type="button" disabled={movingId !== '' || index === items.length - 1} onClick={() => void move(item, 1)}>下移</button>
                <button className="text-button" type="button" onClick={() => edit(item)}>编辑</button>
                <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`} type="button" onClick={() => void toggleStatus(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
              </div>
            </article>
          );
        })}</div> : <div className="navigation-empty"><span>✦</span><strong>暂无培训资源</strong><small>新增并启用后，内容会显示在官网培训资源页面。</small></div>}
      </section>
    </div>
  );
}
