'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { UploadPayload } from '../content/types';

type MessageState = {
  text: string;
  type?: 'success' | 'error' | 'info';
};

type DownloadCategoryAdmin = {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  sort?: number | string;
  status?: 'enabled' | 'disabled' | string;
};

type DownloadResourceAdmin = {
  id: string;
  name?: string;
  description?: string;
  categorySlug?: string;
  fileId?: string;
  fileUrl?: string;
  filename?: string;
  filesize?: number;
  fileType?: string;
  sort?: number | string;
  status?: 'enabled' | 'disabled' | string;
};

const emptyCategory = (): DownloadCategoryAdmin => ({
  id: '',
  name: '',
  slug: '',
  description: '',
  sort: 0,
  status: 'enabled',
});

const emptyResource = (): DownloadResourceAdmin => ({
  id: '',
  name: '',
  description: '',
  categorySlug: '',
  fileId: '',
  filename: '',
  filesize: 0,
  fileType: '',
  sort: 0,
  status: 'enabled',
});

const slugPattern = /^[a-z0-9][a-z0-9-]*$/;
const allowedDocumentExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'mov', 'webm']);
const maxUploadBytes = 50 * 1024 * 1024;
const maxVideoUploadBytes = 200 * 1024 * 1024;

const plainText = (value?: string) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const formatFileSize = (bytes?: number) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return '大小未知';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export function DownloadManager() {
  const [categories, setCategories] = useState<DownloadCategoryAdmin[]>([]);
  const [resources, setResources] = useState<DownloadResourceAdmin[]>([]);
  const [categoryForm, setCategoryForm] = useState<DownloadCategoryAdmin>(emptyCategory);
  const [resourceForm, setResourceForm] = useState<DownloadResourceAdmin>(emptyResource);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [categoryResult, resourceResult] = await Promise.all([
        AdminApi.downloadCategories({ limit: 500 }),
        AdminApi.downloads({ limit: 500 }),
      ]);
      setCategories((categoryResult.data || []) as DownloadCategoryAdmin[]);
      setResources((resourceResult.data || []) as DownloadResourceAdmin[]);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '资料下载数据加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);

  const setCategoryField = (field: keyof DownloadCategoryAdmin, value: string | number) => {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  };

  const setResourceField = (field: keyof DownloadResourceAdmin, value: string | number) => {
    setResourceForm((current) => ({ ...current, [field]: value }));
  };

  const categoryNameFor = (slug?: string) => categories.find((item) => item.slug === slug)?.name || '未分类或分类已停用';

  const categoryResourceCount = (slug?: string) => resources.filter((item) => item.categorySlug === slug).length;

  const uploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
    if (!allowedDocumentExtensions.has(extension)) {
      setMessage({ text: '资料附件支持 PDF、Word、Excel 文档，以及 MP4、MOV、WEBM 视频。', type: 'error' });
      input.value = '';
      return;
    }
    const isVideo = ['mp4', 'mov', 'webm'].includes(extension);
    if (file.size > (isVideo ? maxVideoUploadBytes : maxUploadBytes)) {
      setMessage({ text: isVideo ? '视频大小不能超过 200MB。' : '资料附件大小不能超过 50MB。', type: 'error' });
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
      if (!payload.id) throw new Error('附件上传成功但未返回文件 ID。');
      setResourceForm((current) => ({
        ...current,
        fileId: payload.id,
        filename: payload.filename || file.name,
        filesize: Number(payload.filesize) || file.size,
        fileType: payload.type || file.type,
      }));
      setMessage({ text: '附件已上传；保存资料后才会在前台生效。', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '附件上传失败，请确认文件服务和当前账号权限。', type: 'error' });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };


  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = String(categoryForm.name || '').trim();
    const slug = String(categoryForm.slug || '').trim();
    if (!name) {
      setMessage({ text: '请填写资料分类名称。', type: 'error' });
      return;
    }
    if (!slug) {
      setMessage({ text: '请填写资料分类标识。', type: 'error' });
      return;
    }
    if (!slugPattern.test(slug)) {
      setMessage({ text: '分类标识只能使用小写字母、数字和连字符。', type: 'error' });
      return;
    }
    if (categories.some((item) => item.slug === slug && item.id !== categoryForm.id)) {
      setMessage({ text: '分类标识已存在，请更换后再保存。', type: 'error' });
      return;
    }
    setIsSavingCategory(true);
    setMessage(null);
    const payload = {
      name,
      slug,
      description: String(categoryForm.description || ''),
      sort: Number(categoryForm.sort || 0),
      status: categoryForm.status || 'enabled',
    };
    try {
      if (categoryForm.id) await AdminApi.updateDownloadCategory(categoryForm.id, payload);
      else await AdminApi.createDownloadCategory(payload);
      setMessage({ text: categoryForm.id ? '资料分类已保存。' : '资料分类已新增。', type: 'success' });
      setCategoryForm(emptyCategory());
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存资料分类失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const editCategory = (item: DownloadCategoryAdmin) => {
    setCategoryForm({
      ...emptyCategory(),
      ...item,
      sort: Number(item.sort || 0),
      status: item.status || 'enabled',
    });
    setMessage(null);
  };

  const toggleCategoryEnabled = async (item: DownloadCategoryAdmin) => {
    const enabled = item.status !== 'enabled';
    const count = categoryResourceCount(item.slug);
    const prompt = enabled
      ? '确认启用该资料分类？启用后分类会显示在前台。'
      : `确认停用该资料分类？停用后该分类及${count ? `其下 ${count} 条资料` : '其下资料'}将不再显示在前台。`;
    if (!window.confirm(prompt)) return;
    setMessage(null);
    try {
      await AdminApi.setDownloadCategoryEnabled(item.id, enabled);
      setMessage({ text: enabled ? '该资料分类已启用。' : '该资料分类已停用。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新资料分类状态失败，请稍后重试。', type: 'error' });
    }
  };

  const saveResource = async (event: FormEvent) => {
    event.preventDefault();
    const name = String(resourceForm.name || '').trim();
    const categorySlug = String(resourceForm.categorySlug || '').trim();
    if (!name) {
      setMessage({ text: '请填写资料名称。', type: 'error' });
      return;
    }
    if (!categorySlug) {
      setMessage({ text: '请选择资料分类。', type: 'error' });
      return;
    }
    if (!resourceForm.fileId) {
      setMessage({ text: '请先上传资料附件。', type: 'error' });
      return;
    }
    if (Number(resourceForm.filesize || 0) <= 0) {
      setMessage({ text: '当前附件内容为空，请重新选择有内容的文件上传后再保存。', type: 'error' });
      return;
    }
    setIsSavingResource(true);
    setMessage(null);
    const payload = {
      name,
      description: String(resourceForm.description || ''),
      category_slug: categorySlug,
      file_id: resourceForm.fileId,
      sort: Number(resourceForm.sort || 0),
      status: resourceForm.status || 'enabled',
    };
    try {
      if (resourceForm.id) await AdminApi.updateDownload(resourceForm.id, payload);
      else await AdminApi.createDownload(payload);
      setMessage({ text: resourceForm.id ? '资料已保存。' : '资料已新增。', type: 'success' });
      setResourceForm(emptyResource());
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '保存资料失败，请稍后重试。', type: 'error' });
    } finally {
      setIsSavingResource(false);
    }
  };

  const removeCategory = async (item: DownloadCategoryAdmin) => {
    if (!window.confirm(`确认删除分类“${item.name || '该资料分类'}”？删除后不可恢复；分类下仍有资料时需先调整资料分类。`)) return;
    setMessage(null);
    try {
      await AdminApi.deleteDownloadCategory(item.id);
      if (categoryForm.id === item.id) setCategoryForm(emptyCategory());
      setMessage({ text: '该资料分类已删除。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '删除资料分类失败，请稍后重试。', type: 'error' });
    }
  };

  const editResource = (item: DownloadResourceAdmin) => {
    setResourceForm({
      ...emptyResource(),
      ...item,
      sort: Number(item.sort || 0),
      status: item.status || 'enabled',
    });
    setMessage(null);
  };

  const toggleResourceEnabled = async (item: DownloadResourceAdmin) => {
    const enabled = item.status !== 'enabled';
    if (!window.confirm(enabled ? '确认启用该资料？启用后将显示在前台下载中心。' : '确认停用该资料？停用后将不再显示在前台。')) return;
    setMessage(null);
    try {
      await AdminApi.setDownloadEnabled(item.id, enabled);
      setMessage({ text: enabled ? '该资料已启用。' : '该资料已停用。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新资料状态失败，请稍后重试。', type: 'error' });
    }
  };


  const removeResource = async (item: DownloadResourceAdmin) => {
    if (!window.confirm(`确认删除资料“${item.name || '该资料'}”？删除后不可恢复，只想在前台隐藏请改用停用。`)) return;
    setMessage(null);
    try {
      await AdminApi.deleteDownload(item.id);
      if (resourceForm.id === item.id) setResourceForm(emptyResource());
      setMessage({ text: '该资料已删除。', type: 'success' });
      await loadAll();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '删除资料失败，请稍后重试。', type: 'error' });
    }
  };

  return (
    <div className="leadership-admin">
      {message ? <div className={`inline-message ${message.type || ''}`.trim()} role={message.type === 'error' ? 'alert' : undefined}>{message.text}</div> : null}

      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">DOWNLOAD · CATEGORIES</p><h2>{categoryForm.id ? '编辑资料分类' : '新增资料分类'}</h2></div>
          {categoryForm.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">资料分类保存在现有 page_content_items 表中；分类标识用于前台筛选，停用分类后其下资料不会在前台显示。</p>
        <form className="editor-grid" onSubmit={saveCategory}>
          <label>分类名称<input required maxLength={255} value={categoryForm.name || ''} onChange={(event) => setCategoryField('name', event.target.value)} /></label>
          <label>分类标识<input required maxLength={255} pattern="[a-z0-9][a-z0-9-]*" placeholder="例如：policy-documents" value={categoryForm.slug || ''} onChange={(event) => setCategoryField('slug', event.target.value)} /></label>
          <label>排序<input type="number" step="1" value={String(categoryForm.sort ?? 0)} onChange={(event) => setCategoryField('sort', Number(event.target.value || 0))} /></label>
          <label>状态<select value={categoryForm.status || 'enabled'} onChange={(event) => setCategoryField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <label className="span-2">分类说明<textarea rows={3} value={categoryForm.description || ''} onChange={(event) => setCategoryField('description', event.target.value)} /></label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSavingCategory}>{isSavingCategory ? '正在保存…' : categoryForm.id ? '保存修改' : '新增分类'}</button>
            {categoryForm.id ? <button className="secondary-button" type="button" disabled={isSavingCategory} onClick={() => { setCategoryForm(emptyCategory()); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">DOWNLOAD · RESOURCES</p><h2>{resourceForm.id ? '编辑资料' : '新增资料'}</h2></div>
          {resourceForm.id ? <span className="status-badge status-draft">正在编辑</span> : null}
        </div>
        <p className="form-help-text">资料名称、说明、附件、分类、排序和启停状态保存在现有 page_content_items 表中；前台仅展示启用分类下的启用资料。</p>
        <form className="editor-grid" onSubmit={saveResource}>
          <label>资料名称<input required maxLength={255} value={resourceForm.name || ''} onChange={(event) => setResourceField('name', event.target.value)} /></label>
          <label>资料分类<select required value={resourceForm.categorySlug || ''} onChange={(event) => setResourceField('categorySlug', event.target.value)}><option value="">请选择分类</option>{categories.map((item) => <option value={item.slug || ''} key={item.id}>{item.name}{item.status === 'enabled' ? '' : '（已停用）'}</option>)}</select></label>
          <div className="span-2 leadership-photo-field">
            <label htmlFor="download-resource-file">资料附件</label>
            <p className="field-tip">支持 PDF、Word、Excel 文档（不超过 50MB）与 MP4、MOV、WEBM 视频（不超过 200MB）。重新上传会替换当前附件，保存后生效。</p>
            <input id="download-resource-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4,video/quicktime,video/webm" onChange={uploadAttachment} disabled={isUploading} />
            {resourceForm.fileId ? (
              <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
                <span className="pill">{resourceForm.filename || '附件'}</span>
                <small className="muted-text">{formatFileSize(resourceForm.filesize)}</small>
              </div>
            ) : null}
          </div>
          <label>排序<input type="number" step="1" value={String(resourceForm.sort ?? 0)} onChange={(event) => setResourceField('sort', Number(event.target.value || 0))} /></label>
          <label>状态<select value={resourceForm.status || 'enabled'} onChange={(event) => setResourceField('status', event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
          <label className="span-2">资料说明<textarea rows={4} value={resourceForm.description || ''} onChange={(event) => setResourceField('description', event.target.value)} /></label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSavingResource || isUploading}>{isSavingResource ? '正在保存…' : resourceForm.id ? '保存修改' : '新增资料'}</button>
            {resourceForm.id ? <button className="secondary-button" type="button" disabled={isSavingResource} onClick={() => { setResourceForm(emptyResource()); setMessage(null); }}>取消编辑</button> : null}
          </div>
        </form>
      </section>


      <section className="table-card">
        <div className="section-title-row">
          <div><p className="eyebrow">CATEGORY LIST</p><h2>资料分类列表</h2></div>
          <span className="leadership-list-count">共 {categories.length} 条</span>
        </div>
        {isLoading ? <p className="muted-text">正在加载资料分类…</p> : categories.length ? (
          <div className="leadership-admin-list">
            {categories.map((item) => (
              <article className="timeline-item-card leadership-admin-item" key={item.id}>
                <div className="leadership-admin-item-copy">
                  <div className="leadership-admin-item-heading">
                    <div><h3>{item.name || '未命名分类'}</h3><strong>{item.slug || '未设置标识'}</strong></div>
                    <span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span>
                  </div>
                  <p>{plainText(item.description) || '暂无分类说明。'}</p>
                  <small>排序：{Number(item.sort || 0)} · 资料：{categoryResourceCount(item.slug)} 条</small>
                </div>
                <div className="table-actions leadership-admin-actions">
                  <button className="text-button" type="button" onClick={() => editCategory(item)}>编辑</button>
                  <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`.trim()} type="button" onClick={() => void toggleCategoryEnabled(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
                  <button className="text-button is-danger" type="button" onClick={() => void removeCategory(item)}>删除</button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="navigation-empty"><span>✦</span><strong>暂无资料分类</strong><small>先新增分类，再上传资料并在前台“资料下载”页面展示。</small></div>}
      </section>

      <section className="table-card">
        <div className="section-title-row">
          <div><p className="eyebrow">RESOURCE LIST</p><h2>资料列表</h2></div>
          <span className="leadership-list-count">共 {resources.length} 条</span>
        </div>
        {isLoading ? <p className="muted-text">正在加载资料…</p> : resources.length ? (
          <div className="leadership-admin-list">
            {resources.map((item) => (
              <article className="timeline-item-card leadership-admin-item" key={item.id}>
                <div className="leadership-admin-item-copy">
                  <div className="leadership-admin-item-heading">
                    <div><h3>{item.name || '未命名资料'}</h3><strong>{categoryNameFor(item.categorySlug)}</strong></div>
                    <span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span>
                  </div>
                  <p>{plainText(item.description) || '暂无资料说明。'}</p>
                  <small>附件：{item.filename || '未上传'} · {formatFileSize(item.filesize)} · 排序：{Number(item.sort || 0)}</small>
                </div>
                <div className="table-actions leadership-admin-actions">
                  <button className="text-button" type="button" onClick={() => editResource(item)}>编辑</button>
                  <button className={`text-button${item.status === 'enabled' ? ' is-danger' : ''}`.trim()} type="button" onClick={() => void toggleResourceEnabled(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
                  <button className="text-button is-danger" type="button" onClick={() => void removeResource(item)}>删除</button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="navigation-empty"><span>✦</span><strong>暂无资料</strong><small>上传附件并保存后，启用资料会显示在官网“资料下载”页面。</small></div>}
      </section>
    </div>
  );
}
