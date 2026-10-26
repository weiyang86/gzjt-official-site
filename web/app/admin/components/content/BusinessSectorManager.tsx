'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi, type AdminBusinessSector } from '@/lib/admin/admin-api';
import type { MessageState } from './types';

type SectorForm = {
  id: string;
  name: string;
  slug: string;
  cover: string;
  intro: string;
  sort: number;
  status: string;
};

const emptyForm = (sort = 0): SectorForm => ({
  id: '',
  name: '',
  slug: '',
  cover: '',
  intro: '',
  sort,
  status: 'enabled',
});

const toForm = (sector: AdminBusinessSector): SectorForm => ({
  id: sector.id,
  name: sector.name || '',
  slug: sector.slug || '',
  cover: sector.cover || '',
  intro: sector.intro || '',
  sort: Number(sector.sort) || 0,
  status: sector.status || 'enabled',
});

const validate = (form: SectorForm) => {
  if (!form.name.trim()) return '请填写板块名称。';
  if (form.name.trim().length > 50) return '板块名称不能超过 50 个字符。';
  if (!form.slug.trim()) return '请填写 slug。';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(form.slug.trim())) return 'slug 只能使用小写字母、数字和中横线。';
  return '';
};

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 50 * 1024 * 1024;

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 50MB。';
  return '';
};

export function BusinessSectorManager() {
  const [items, setItems] = useState<AdminBusinessSector[]>([]);
  const [form, setForm] = useState<SectorForm>(() => emptyForm());
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.businessSectors();
      const rows = (result.data || []) as AdminBusinessSector[];
      setItems(rows);
      return rows;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '业务板块加载失败。', type: 'error' });
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

  const selectItem = (item: AdminBusinessSector) => {
    setForm(toForm(item));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
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
      setForm((current) => ({ ...current, cover: uploaded.id as string }));
      setMessage({ text: '封面图已上传，保存后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '封面图上传失败。', type: 'error' });
    } finally {
      input.value = '';
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validate(form);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      cover: form.cover || null,
      intro: form.intro.trim(),
      sort: Number(form.sort) || 0,
      status: form.status || 'enabled',
    };
    try {
      if (form.id) {
        await AdminApi.updateBusinessSector(form.id, payload);
        setMessage({ text: '业务板块已更新。', type: 'success' });
      } else {
        await AdminApi.createBusinessSector(payload);
        setMessage({ text: '业务板块已新增。', type: 'success' });
      }
      const rows = await loadItems();
      const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
      setForm(emptyForm(maxSort + 1));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存业务板块失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: AdminBusinessSector) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    const label = nextStatus === 'enabled' ? '启用' : '停用';
    if (!window.confirm(`确认${label}“${item.name}”？`)) return;
    try {
      await AdminApi.updateBusinessSector(item.id, {
        name: item.name,
        slug: item.slug,
        cover: item.cover || null,
        intro: item.intro || '',
        sort: Number(item.sort) || 0,
        status: nextStatus,
      });
      setMessage({ text: `业务板块已${label}。`, type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '状态更新失败。', type: 'error' });
    }
  };

  const removeItem = async (item: AdminBusinessSector) => {
    if (!window.confirm(`确认删除“${item.name}”？删除后不可恢复。`)) return;
    try {
      await AdminApi.deleteBusinessSector(item.id);
      if (form.id === item.id) setForm(emptyForm());
      setMessage({ text: '业务板块已删除。', type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '删除失败。', type: 'error' });
    }
  };

  return (
    <main className="dashboard-content" aria-label="业务板块管理">
      {message && <div className={`inline-message ${message.type}`}>{message.text}</div>}

      <section className="notice-card">
        <p className="eyebrow">业务板块 · business_sectors</p>
        <h2>业务板块管理</h2>
        <p>板块信息保存到 business_sectors 表，前台 /business 页面读取已启用记录。排序值越小越靠前，停用只影响前台展示，不删除数据。</p>
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{form.id ? '编辑板块' : '新增板块'}</p>
            <h2>{form.id ? form.name : '新增业务板块'}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
        </div>
        <form className="editor-grid" onSubmit={handleSubmit}>
          <label>板块名称 <span className="required">*</span>
            <input type="text" maxLength={50} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>slug <span className="required">*</span>
            <input type="text" maxLength={60} required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="project-construction" />
          </label>
          <label className="span-2">板块简介
            <textarea rows={5} value={form.intro} onChange={(event) => setForm({ ...form, intro: event.target.value })} />
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
            <label>封面图</label>
            <p className="field-tip">前台业务板块卡片使用，支持 JPG、PNG、WEBP，单个文件不超过 50MB。</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={isUploading} />
            {form.cover ? (
              <div className="cover-preview-wrap">
                <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.cover)}`} alt="封面预览" />
                <button className="secondary-button" type="button" onClick={() => setForm({ ...form, cover: '' })}>移除图片</button>
              </div>
            ) : null}
          </div>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : '保存业务板块'}</button>
          </div>
        </form>
      </section>

      <section className="table-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">当前配置</p>
            <h2>业务板块列表</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadItems}>刷新</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>slug</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5}>正在加载...</td></tr>}
              {!isLoading && items.length === 0 && <tr><td colSpan={5}>暂无业务板块，点击上方新增开始配置。</td></tr>}
              {!isLoading && items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td className="muted-text">{item.slug}</td>
                  <td>{Number(item.sort) || 0}</td>
                  <td>{item.status === 'enabled' ? '启用' : '停用'}</td>
                  <td>
                    <button className="text-button" type="button" onClick={() => selectItem(item)}>编辑</button>
                    <button className="text-button" type="button" onClick={() => toggleStatus(item)}>
                      {item.status === 'enabled' ? '停用' : '启用'}
                    </button>
                    <button className="text-button" type="button" onClick={() => removeItem(item)}>删除</button>
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
