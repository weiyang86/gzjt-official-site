'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContentItem, PageModule } from './types';

const moduleCode = 'downloads';
const itemType = 'link';

type DownloadForm = {
  id: string;
  title: string;
  category: string;
  date: string;
  fileId: string;
  filename: string;
  filesize: number;
  sort: number;
  status: string;
};

const emptyForm = (sort = 0): DownloadForm => ({
  id: '',
  title: '',
  category: '规章制度',
  date: '',
  fileId: '',
  filename: '',
  filesize: 0,
  sort,
  status: 'enabled',
});

const readExtra = (item: PageContentItem): Record<string, unknown> => (
  item.extra_json && typeof item.extra_json === 'object' && !Array.isArray(item.extra_json)
    ? item.extra_json as Record<string, unknown>
    : {}
);

const toForm = (item: PageContentItem): DownloadForm => {
  const extra = readExtra(item);
  return {
    id: item.id,
    title: item.title || '',
    category: typeof extra.category === 'string' ? extra.category : (item.subtitle || '规章制度'),
    date: item.date_label || '',
    fileId: typeof extra.file_id === 'string' ? extra.file_id : '',
    filename: typeof extra.filename === 'string' ? extra.filename : '',
    filesize: Number(extra.filesize) || 0,
    sort: Number(item.sort) || 0,
    status: item.status || 'enabled',
  };
};

const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const maxUploadBytes = 50 * 1024 * 1024;

const validateFile = (file?: File | null) => {
  if (!file) return '请选择文件。';
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  if (!allowedExtensions.includes(extension)) return '仅支持 PDF、Word、Excel 文件。';
  if (file.size > maxUploadBytes) return '文件大小不能超过 50MB。';
  return '';
};

const formatSize = (size: number) => {
  if (!size || size <= 0) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

export function DownloadManager({ module }: { module: PageModule }) {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<DownloadForm>(() => emptyForm());
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode, item_type: itemType });
      const rows = ((result.data || []) as PageContentItem[])
        .filter((item) => item.module_code === moduleCode)
        .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      setItems(rows);
      return rows;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '下载条目加载失败。', type: 'error' });
      setItems([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const resetForm = () => {
    const nextSort = items.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0) + 1;
    setForm(emptyForm(nextSort));
    setMessage(null);
  };

  const selectItem = (item: PageContentItem) => {
    setForm(toForm(item));
    setMessage(null);
    document.getElementById('download-item-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    const error = validateFile(file);
    if (error) {
      input.value = '';
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as { id?: string; filename?: string; filesize?: number };
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setForm((current) => ({
        ...current,
        fileId: uploaded.id as string,
        filename: uploaded.filename || (file as File).name,
        filesize: uploaded.filesize || (file as File).size,
      }));
      setMessage({ text: '文件已上传，保存后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '文件上传失败。', type: 'error' });
    } finally {
      input.value = '';
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage({ text: '请填写资料名称。', type: 'error' });
      return;
    }
    if (!form.fileId) {
      setMessage({ text: '请先上传资料文件。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      module_code: moduleCode,
      item_type: itemType,
      title: form.title.trim(),
      subtitle: form.category.trim(),
      date_label: form.date.trim(),
      link_url: `/api/public/cms/assets/${encodeURIComponent(form.fileId)}`,
      sort: Number(form.sort) || 0,
      status: form.status || 'enabled',
      extra_json: {
        file_id: form.fileId,
        filename: form.filename,
        filesize: form.filesize,
        category: form.category.trim(),
      },
    };
    try {
      if (form.id) {
        await AdminApi.updatePageContentItem(form.id, payload);
        setMessage({ text: '资料条目已更新。', type: 'success' });
      } else {
        await AdminApi.createPageContentItem(payload);
        setMessage({ text: '资料条目已新增。', type: 'success' });
      }
      const rows = await loadItems();
      const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
      setForm(emptyForm(maxSort + 1));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存资料条目失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    const label = nextStatus === 'enabled' ? '启用' : '停用';
    if (!window.confirm(`确认${label}“${item.title}”？`)) return;
    const extra = readExtra(item);
    try {
      await AdminApi.updatePageContentItem(item.id, {
        module_code: moduleCode,
        item_type: itemType,
        title: item.title || '',
        subtitle: item.subtitle || '',
        date_label: item.date_label || '',
        link_url: item.link_url || '',
        sort: Number(item.sort) || 0,
        status: nextStatus,
        extra_json: extra,
      });
      setMessage({ text: `资料条目已${label}。`, type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '状态更新失败。', type: 'error' });
    }
  };

  return (
    <main className="dashboard-content" aria-label="资料下载条目">
      {message && <div className={`inline-message ${message.type}`}>{message.text}</div>}

      <section className="notice-card">
        <p className="eyebrow">资料下载 · {module.module_title || '资料下载'}</p>
        <h2>下载条目管理</h2>
        <p>条目保存到 page_content_items（module_code = downloads，item_type = link），文件复用后台文件上传。前台 /disclosure/downloads 展示已启用条目。</p>
      </section>

      <section className="editor-card" id="download-item-editor">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{form.id ? '编辑资料' : '新增资料'}</p>
            <h2>{form.id ? form.title : '新增下载资料'}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
        </div>
        <form className="editor-grid" onSubmit={handleSubmit}>
          <label>资料名称 <span className="required">*</span>
            <input type="text" maxLength={100} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>资料分类
            <input type="text" maxLength={30} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="规章制度" />
          </label>
          <label>发布日期
            <input type="text" maxLength={20} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} placeholder="2026-10-26" />
          </label>
          <label>排序
            <input type="number" value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) || 0 })} />
          </label>
          <label>状态
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
            </select>
          </label>
          <div className="cover-field span-2">
            <label>资料文件 <span className="required">*</span></label>
            <p className="field-tip">支持 PDF、Word、Excel，单个文件不超过 50MB。</p>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={uploadFile} disabled={isUploading} />
            {form.fileId ? (
              <p className="form-help-text">
                已上传：{form.filename || form.fileId} {formatSize(form.filesize)}
              </p>
            ) : null}
          </div>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : '保存资料条目'}</button>
          </div>
        </form>
      </section>

      <section className="table-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">当前条目</p>
            <h2>资料列表</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadItems}>刷新</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>资料名称</th>
                <th>分类</th>
                <th>日期</th>
                <th>大小</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>正在加载...</td></tr>}
              {!isLoading && items.length === 0 && <tr><td colSpan={7}>暂无资料条目，点击上方新增开始配置。</td></tr>}
              {!isLoading && items.map((item) => {
                const extra = readExtra(item);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong></td>
                    <td>{item.subtitle || '-'}</td>
                    <td>{item.date_label || '-'}</td>
                    <td>{formatSize(Number(extra.filesize) || 0) || '-'}</td>
                    <td>{Number(item.sort) || 0}</td>
                    <td>{item.status === 'enabled' ? '启用' : '停用'}</td>
                    <td>
                      <button className="text-button" type="button" onClick={() => selectItem(item)}>编辑</button>
                      <button className="text-button" type="button" onClick={() => toggleStatus(item)}>
                        {item.status === 'enabled' ? '停用' : '启用'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
