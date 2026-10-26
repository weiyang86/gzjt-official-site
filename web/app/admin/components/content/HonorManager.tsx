'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContentItem, PageModule } from './types';

const moduleCode = 'honors';
const itemType = 'image';

type HonorForm = {
  id: string;
  title: string;
  issuer: string;
  year: string;
  image: string;
  description: string;
  sort: number;
  status: string;
};

const emptyForm = (sort = 0): HonorForm => ({
  id: '',
  title: '',
  issuer: '',
  year: '',
  image: '',
  description: '',
  sort,
  status: 'enabled',
});

const toForm = (item: PageContentItem): HonorForm => ({
  id: item.id,
  title: item.title || '',
  issuer: item.subtitle || '',
  year: item.date_label || '',
  image: item.image || '',
  description: item.content || '',
  sort: Number(item.sort) || 0,
  status: item.status || 'enabled',
});

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 50 * 1024 * 1024;

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 50MB。';
  return '';
};

export function HonorManager({ module }: { module: PageModule }) {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<HonorForm>(() => emptyForm());
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
      setMessage({ text: err instanceof Error ? err.message : '荣誉条目加载失败。', type: 'error' });
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
    document.getElementById('honor-item-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    const error = validateImage(file);
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
      const uploaded = (result.data || {}) as { id?: string };
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setForm((current) => ({ ...current, image: uploaded.id as string }));
      setMessage({ text: '荣誉图片已上传，保存后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '图片上传失败。', type: 'error' });
    } finally {
      input.value = '';
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage({ text: '请填写荣誉名称。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      module_code: moduleCode,
      item_type: itemType,
      title: form.title.trim(),
      subtitle: form.issuer.trim(),
      date_label: form.year.trim(),
      image: form.image || null,
      content: form.description,
      sort: Number(form.sort) || 0,
      status: form.status || 'enabled',
      extra_json: {},
    };
    try {
      if (form.id) {
        await AdminApi.updatePageContentItem(form.id, payload);
        setMessage({ text: '荣誉条目已更新。', type: 'success' });
      } else {
        await AdminApi.createPageContentItem(payload);
        setMessage({ text: '荣誉条目已新增。', type: 'success' });
      }
      const rows = await loadItems();
      const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
      setForm(emptyForm(maxSort + 1));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存荣誉条目失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    const label = nextStatus === 'enabled' ? '启用' : '停用';
    if (!window.confirm(`确认${label}“${item.title}”？`)) return;
    try {
      await AdminApi.updatePageContentItem(item.id, {
        module_code: moduleCode,
        item_type: itemType,
        title: item.title || '',
        subtitle: item.subtitle || '',
        date_label: item.date_label || '',
        image: item.image || null,
        content: item.content || '',
        sort: Number(item.sort) || 0,
        status: nextStatus,
        extra_json: item.extra_json || {},
      });
      setMessage({ text: `荣誉条目已${label}。`, type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '状态更新失败。', type: 'error' });
    }
  };

  return (
    <main className="dashboard-content" aria-label="荣誉资质条目">
      {message && <div className={`inline-message ${message.type}`}>{message.text}</div>}

      <section className="notice-card">
        <p className="eyebrow">荣誉资质 · {module.module_title || '荣誉资质'}</p>
        <h2>荣誉条目管理</h2>
        <p>条目保存到 page_content_items（module_code = honors，item_type = image），前台集团概况页展示已启用条目。停用后前台立即隐藏。</p>
      </section>

      <section className="editor-card" id="honor-item-editor">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{form.id ? '编辑荣誉' : '新增荣誉'}</p>
            <h2>{form.id ? form.title : '新增荣誉条目'}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
        </div>
        <form className="editor-grid" onSubmit={handleSubmit}>
          <label>荣誉名称 <span className="required">*</span>
            <input type="text" maxLength={80} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>颁发单位
            <input type="text" maxLength={80} value={form.issuer} onChange={(event) => setForm({ ...form, issuer: event.target.value })} />
          </label>
          <label>年份
            <input type="text" maxLength={20} value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} placeholder="2025" />
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
          <label className="span-2">荣誉说明
            <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <div className="cover-field span-2">
            <label>证书 / 奖牌图片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB。</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={isUploading} />
            {form.image ? (
              <div className="cover-preview-wrap">
                <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.image)}`} alt="荣誉图片预览" />
                <button className="secondary-button" type="button" onClick={() => setForm({ ...form, image: '' })}>移除图片</button>
              </div>
            ) : null}
          </div>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : '保存荣誉条目'}</button>
          </div>
        </form>
      </section>

      <section className="table-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">当前条目</p>
            <h2>荣誉列表</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadItems}>刷新</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>颁发单位</th>
                <th>年份</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6}>正在加载...</td></tr>}
              {!isLoading && items.length === 0 && <tr><td colSpan={6}>暂无荣誉条目，点击上方新增开始配置。</td></tr>}
              {!isLoading && items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.subtitle || '-'}</td>
                  <td>{item.date_label || '-'}</td>
                  <td>{Number(item.sort) || 0}</td>
                  <td>{item.status === 'enabled' ? '启用' : '停用'}</td>
                  <td>
                    <button className="text-button" type="button" onClick={() => selectItem(item)}>编辑</button>
                    <button className="text-button" type="button" onClick={() => toggleStatus(item)}>
                      {item.status === 'enabled' ? '停用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
