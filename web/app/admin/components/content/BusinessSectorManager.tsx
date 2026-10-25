'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { BusinessSectorAdminItem, MessageState, UploadPayload } from './types';

const emptySector = (): BusinessSectorAdminItem => ({
  id: '',
  name: '',
  slug: '',
  cover: '',
  intro: '',
  sort: 0,
  status: 'enabled',
});

const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const slugPattern = /^[a-z0-9][a-z0-9-]*$/;

const coverSrc = (cover?: string | null) => {
  const value = String(cover || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|\/)/i.test(value)) return value;
  return `/admin-api/assets/${encodeURIComponent(value)}`;
};

export function BusinessSectorManager() {
  const [items, setItems] = useState<BusinessSectorAdminItem[]>([]);
  const [form, setForm] = useState<BusinessSectorAdminItem>(emptySector);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.businessSectors({ limit: 200 });
      setItems((result.data || []) as BusinessSectorAdminItem[]);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '产业布局内容加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const setField = (field: keyof BusinessSectorAdminItem, value: string | number | null) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ text: '产业图片仅支持 JPG、PNG、WEBP 格式。', type: 'error' });
      input.value = '';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ text: '产业图片大小不能超过 50MB。', type: 'error' });
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
      if (!payload.id) throw new Error('图片上传成功但未返回文件 ID。');
      setField('cover', payload.id);
      setMessage({ text: '产业图片已上传，保存后生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '产业图片上传失败，请确认文件服务和当前账号权限。', type: 'error' });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const name = String(form.name || '').trim();
    const slug = String(form.slug || '').trim();
    if (!name) {
      setMessage({ text: '请填写板块名称。', type: 'error' });
      return;
    }
    if (!slug) {
      setMessage({ text: '请填写板块标识。', type: 'error' });
      return;
    }
    if (!slugPattern.test(slug)) {
      setMessage({ text: '板块标识只能使用小写字母、数字和连字符。', type: 'error' });
      return;
    }
    if (items.some((item) => item.slug === slug && item.id !== form.id)) {
      setMessage({ text: '板块标识已存在，请更换后再保存。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      name,
      slug,
      cover: form.cover || '',
      intro: String(form.intro || ''),
      sort: Number(form.sort || 0),
      status: form.status || 'enabled',
    };
    try {
      if (form.id) await AdminApi.updateBusinessSector(form.id, payload);
      else await AdminApi.createBusinessSector(payload);
      setMessage({ text: form.id ? '产业板块已保存。' : '产业板块已新增。', type: 'success' });
      setForm(emptySector());
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存产业板块失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (item: BusinessSectorAdminItem) => {
    setForm({
      ...emptySector(),
      ...item,
      id: item.id,
      sort: Number(item.sort || 0),
      status: item.status || 'enabled',
    });
    setMessage(null);
  };

  const toggleEnabled = async (item: BusinessSectorAdminItem) => {
    const enabled = item.status !== 'enabled';
    if (!window.confirm(enabled ? '确认启用该产业板块？启用后将显示在前台。' : '确认停用该产业板块？停用后将不再显示在前台。')) return;
    setMessage(null);
    try {
      await AdminApi.setBusinessSectorEnabled(item.id, enabled);
      setMessage({ text: enabled ? '该产业板块已启用。' : '该产业板块已停用。', type: 'success' });
      await loadItems();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新产业板块状态失败，请稍后重试。', type: 'error' });
    }
  };

  return (
    <div className="leadership-admin">
      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">business-layout · business_sectors</p><h2>{form.id ? '编辑产业板块' : '新增产业板块'}</h2></div>
          {form.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">名称、简介、图片、排序和启停状态保存在产业布局数据中；前台“业务领域 / 产业布局”页面按排序展示启用内容，并可查看产业详情。</p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()} role={message.type === 'error' ? 'alert' : undefined}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={save}>
          <label>产业名称<input required maxLength={255} value={form.name || ''} onChange={(event) => setField('name', event.target.value)} /></label>
          <label>产业标识<input required maxLength={255} pattern="[a-z0-9][a-z0-9-]*" placeholder="例如：transport-construction" value={form.slug || ''} onChange={(event) => setField('slug', event.target.value)} /></label>
          <div className="span-2 leadership-photo-field">
            <label htmlFor="business-sector-cover">产业图片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB。未上传时前台显示默认图片。</p>
            <input id="business-sector-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={isUploading} />
            {form.cover ? (
              <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                <img src={coverSrc(form.cover)} alt="板块图片预览" style={{ width: 240, height: 135, objectFit: 'cover', borderRadius: 10, background: 'var(--admin-panel-soft)' }} />
                <button className="text-button is-danger" type="button" onClick={() => setField('cover', '')}>清除图片</button>
              </div>
            ) : null}
          </div>
          <label>排序<input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
          <label>状态<select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <label className="span-2">产业简介<textarea rows={8} value={form.intro || ''} onChange={(event) => setField('intro', event.target.value)} /></label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploading}>{isSaving ? '正在保存…' : form.id ? '保存修改' : '新增产业'}</button>
            {form.id ? <button className="secondary-button" type="button" disabled={isSaving} onClick={() => { setForm(emptySector()); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="table-card leadership-list-card">
        <div className="section-title-row"><div><p className="eyebrow">BUSINESS PORTFOLIO</p><h2>产业板块列表</h2></div><span className="leadership-list-count">共 {items.length} 条</span></div>
        {isLoading ? <p className="muted-text">正在加载产业板块…</p> : items.length ? <div className="leadership-admin-list">{items.map((item) => (
          <article className="timeline-item-card leadership-admin-item" key={item.id}>
            {coverSrc(item.cover)
              ? <img className="leadership-admin-list-photo" src={coverSrc(item.cover)} alt="" style={{ flex: '0 0 120px', width: 120, height: 76 }} />
              : <div className="leadership-admin-list-photo is-missing" style={{ flex: '0 0 120px', width: 120, height: 76 }}>◇</div>}
            <div className="leadership-admin-item-copy">
              <div className="leadership-admin-item-heading"><div><h3>{item.name || '未命名产业'}</h3><strong>{item.slug || '未设置标识'}</strong></div><span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span></div>
              <p>{plainText(String(item.intro || '')) || '暂无产业简介。'}</p>
              <small>排序：{Number(item.sort || 0)}</small>
            </div>
            <div className="table-actions leadership-admin-actions">
              <button className="text-button" type="button" onClick={() => edit(item)}>编辑</button>
              <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`.trim()} type="button" onClick={() => void toggleEnabled(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
            </div>
          </article>
        ))}</div> : <div className="navigation-empty"><span>✦</span><strong>暂无产业板块</strong><small>新增并启用后，内容会显示在官网“业务领域 / 产业布局”页面。</small></div>}
      </section>
    </div>
  );
}
