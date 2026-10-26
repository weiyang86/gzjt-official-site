'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContentItem, UploadPayload } from './types';

const moduleCode = 'group-honors';
const itemType = 'honor';
const maxUploadBytes = 10 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedDocumentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'];

const emptyHonor = (): PageContentItem => ({
  id: '',
  module_code: moduleCode,
  item_type: itemType,
  title: '',
  date_label: '',
  image: null,
  content: '',
  link_url: '',
  sort: 0,
  status: 'enabled',
  extra_json: {},
});

const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getExtraString = (extra: Record<string, unknown> | undefined, key: string) => {
  const value = extra?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

const assetHref = (value: string) => /^https?:\/\//i.test(value) || value.startsWith('/')
  ? value
  : `/admin-api/assets/${encodeURIComponent(value)}`;

export function HonorManager() {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(emptyHonor);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode, item_type: itemType });
      setItems((result.data || []) as PageContentItem[]);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '企业荣誉列表加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const setField = (field: keyof PageContentItem, value: string | number | null) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadCertificate = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      setMessage({ text: '证书图片仅支持 JPG、PNG、WEBP 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > maxUploadBytes) {
      setMessage({ text: '证书图片大小不能超过 10MB。', type: 'error' });
      input.value = '';
      return;
    }
    setIsUploadingImage(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await AdminApi.uploadFile(body);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('图片上传成功但未返回文件 ID。');
      setField('image', uploaded.id);
      setMessage({ text: '证书图片已上传，保存荣誉后生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '证书图片上传失败，请稍后重试。', type: 'error' });
    } finally {
      setIsUploadingImage(false);
      input.value = '';
    }
  };

  const uploadAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedDocumentExtensions.includes(extension) && file.type !== 'application/pdf') {
      setMessage({ text: '附件支持 PDF、Word、Excel、PowerPoint、ZIP、RAR 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > maxUploadBytes) {
      setMessage({ text: '附件大小不能超过 10MB。', type: 'error' });
      input.value = '';
      return;
    }
    setIsUploadingDocument(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await AdminApi.uploadDocument(body);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('附件上传成功但未返回文件 ID。');
      setForm((current) => ({
        ...current,
        link_url: uploaded.id,
        extra_json: { ...(current.extra_json || {}), attachmentName: uploaded.filename || file.name },
      }));
      setMessage({ text: '附件已上传，保存荣誉后生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '附件上传失败，请确认文件格式和账号权限。', type: 'error' });
    } finally {
      setIsUploadingDocument(false);
      input.value = '';
    }
  };

  const removeAttachment = () => {
    setForm((current) => {
      const extra = { ...(current.extra_json || {}) };
      delete extra.attachmentName;
      return { ...current, link_url: '', extra_json: extra };
    });
    setMessage({ text: '附件已移除，保存荣誉后生效。', type: 'info' });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!String(form.title || '').trim()) {
      setMessage({ text: '请填写荣誉名称。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const extra = { ...(form.extra_json || {}) };
    if (!form.link_url) delete extra.attachmentName;
    const payload = {
      module_code: moduleCode,
      item_type: itemType,
      title: String(form.title || '').trim(),
      date_label: String(form.date_label || '').trim(),
      image: form.image || null,
      content: String(form.content || ''),
      link_url: String(form.link_url || '').trim(),
      sort: Number(form.sort || 0),
      status: form.status || 'enabled',
      extra_json: extra,
    };
    try {
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: form.id ? '企业荣誉已更新。' : '企业荣誉已新增。', type: 'success' });
      setForm(emptyHonor());
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存企业荣誉失败，请确认接口和账号权限。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (item: PageContentItem) => {
    setForm({
      ...emptyHonor(),
      ...item,
      image: item.image || null,
      link_url: item.link_url || '',
      sort: Number(item.sort || 0),
      status: item.status || 'enabled',
      extra_json: item.extra_json && typeof item.extra_json === 'object' && !Array.isArray(item.extra_json) ? item.extra_json : {},
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    if (nextStatus === 'disabled' && !window.confirm('确认停用这条企业荣誉？停用后将不再显示在前台。')) return;
    try {
      await AdminApi.updatePageContentItem(item.id, {
        module_code: moduleCode,
        item_type: itemType,
        title: item.title || '',
        date_label: item.date_label || '',
        image: item.image || null,
        content: item.content || '',
        link_url: item.link_url || '',
        sort: Number(item.sort || 0),
        status: nextStatus,
        extra_json: item.extra_json || {},
      });
      setMessage({ text: nextStatus === 'enabled' ? '企业荣誉已启用。' : '企业荣誉已停用。', type: 'success' });
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新企业荣誉状态失败。', type: 'error' });
    }
  };

  return (
    <div className="honors-admin">
      <section className="editor-card content-form-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">page_content_items · honor</p>
            <h2>{form.id ? '编辑企业荣誉' : '新增企业荣誉'}</h2>
          </div>
          {form.id ? <button className="secondary-button" type="button" onClick={() => { setForm(emptyHonor()); setMessage(null); }}>新增荣誉</button> : null}
        </div>
        <p className="form-help-text">荣誉条目保存到 page_content_items，module_code 固定为 {moduleCode}，item_type 固定为 honor；前台 /about/honors 只展示启用条目。</p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()} role={message.type === 'error' ? 'alert' : undefined}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={save}>
          <label>荣誉名称<input required maxLength={255} value={form.title || ''} onChange={(event) => setField('title', event.target.value)} /></label>
          <label>年份<input maxLength={32} placeholder="例如 2024" value={form.date_label || ''} onChange={(event) => setField('date_label', event.target.value)} /></label>

          <div className="span-2 honor-admin-media-field">
            <label htmlFor="honor-certificate">证书图片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 10MB；点击图片可查看大图。</p>
            <div className="cover-upload-row">
              <input id="honor-certificate" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCertificate} disabled={isUploadingImage} />
              {isUploadingImage ? <span className="muted-text">正在上传…</span> : null}
            </div>
            {form.image ? (
              <div className="honor-admin-preview">
                <img src={assetHref(String(form.image))} alt="证书图片预览" />
                <button className="text-button" type="button" onClick={() => setField('image', null)}>移除图片</button>
              </div>
            ) : null}
          </div>

          <label className="span-2">荣誉说明<textarea rows={5} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} /></label>

          <div className="span-2 honor-admin-media-field">
            <label htmlFor="honor-attachment">荣誉附件</label>
            <p className="field-tip">支持 PDF、Word、Excel、PowerPoint、ZIP、RAR，单个文件不超过 10MB；前台以附件链接展示。</p>
            <div className="cover-upload-row">
              <input id="honor-attachment" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,application/pdf" onChange={uploadAttachment} disabled={isUploadingDocument} />
              {isUploadingDocument ? <span className="muted-text">正在上传…</span> : null}
            </div>
            {form.link_url ? (
              <div className="honor-admin-attachment">
                <a href={assetHref(String(form.link_url))} target="_blank" rel="noreferrer">{getExtraString(form.extra_json, 'attachmentName') || '查看当前附件'}</a>
                <button className="text-button" type="button" onClick={removeAttachment}>移除附件</button>
              </div>
            ) : null}
          </div>

          <label>排序<input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
          <label>状态
            <select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}>
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
            </select>
          </label>

          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploadingImage || isUploadingDocument}>{isSaving ? '正在保存…' : '保存荣誉'}</button>
            {form.id ? <button className="secondary-button" type="button" disabled={isSaving} onClick={() => { setForm(emptyHonor()); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="table-card honors-admin-list-card">
        <div className="section-title-row">
          <div><p className="eyebrow">CORPORATE HONORS</p><h2>企业荣誉列表</h2></div>
          <span className="leadership-list-count">共 {items.length} 条</span>
        </div>
        {isLoading ? <p className="muted-text">正在加载企业荣誉…</p> : items.length ? (
          <div className="honors-admin-list">
            {items.map((item) => (
              <article className="timeline-item-card honors-admin-item" key={item.id}>
                {item.image ? <img className="honors-admin-thumb" src={assetHref(String(item.image))} alt="" /> : <div className="honors-admin-thumb is-missing" aria-hidden="true">誉</div>}
                <div className="honors-admin-item-copy">
                  <div className="honors-admin-item-heading">
                    <div>
                      <h3>{item.title}</h3>
                      <strong>{item.date_label || '未填写年份'}{item.link_url ? ' · 含附件' : ''}</strong>
                    </div>
                    <span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span>
                  </div>
                  <p>{plainText(String(item.content || '')) || '暂无荣誉说明。'}</p>
                  <small>排序：{Number(item.sort || 0)}</small>
                </div>
                <div className="table-actions honors-admin-actions">
                  <button className="text-button" type="button" onClick={() => edit(item)}>编辑</button>
                  <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`} type="button" onClick={() => void toggleStatus(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="navigation-empty"><span>✦</span><strong>暂无企业荣誉</strong><small>新增并启用后，内容会显示在官网企业荣誉页面。</small></div>}
      </section>
    </div>
  );
}

