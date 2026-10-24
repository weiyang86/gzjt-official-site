'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';

type CompanyRow = {
  id?: string;
  name?: string;
  short_name?: string;
  slug?: string;
  logo?: string | null;
  cover?: string | null;
  intro?: string;
  address?: string;
  main_business?: string;
  registered_capital?: string;
  sort?: number;
  status?: string;
};

type MessageState = { text: string; type: 'success' | 'error' } | null;

const emptyForm = (): CompanyRow => ({
  id: '',
  name: '',
  short_name: '',
  slug: '',
  logo: '',
  cover: '',
  intro: '',
  address: '',
  main_business: '',
  registered_capital: '',
  sort: 0,
  status: 'enabled',
});

const toForm = (company: CompanyRow): CompanyRow => ({
  ...emptyForm(),
  ...company,
  logo: company.logo || '',
  cover: company.cover || '',
  sort: Number(company.sort || 0),
  status: company.status || 'enabled',
});

const validate = (form: CompanyRow) => {
  if (!form.name?.trim()) return '请输入公司名称。';
  if (!form.slug?.trim()) return '请输入 slug。';
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

export function CompanyManager({ moduleTitle, mode = 'list' }: { moduleTitle?: string; mode?: 'list' | 'intro' }) {
  const [items, setItems] = useState<CompanyRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<CompanyRow>(emptyForm);
  const [message, setMessage] = useState<MessageState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'cover' | 'logo' | ''>('');

  const setField = (field: keyof CompanyRow, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    const maxSort = items.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
    setForm({ ...emptyForm(), sort: maxSort + 1 });
    setMessage(null);
  };

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.companies();
      setItems(((result as { data?: CompanyRow[] }).data || []).filter(Boolean));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '下属公司加载失败。', type: 'error' });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'intro' || selectedId || !items.length) return;
    const first = items[0];
    setSelectedId(first.id || '');
    setForm(toForm(first));
  }, [items, mode, selectedId]);

  const selectCompany = (id: string) => {
    const target = items.find((item) => item.id === id);
    setSelectedId(id);
    if (target) setForm(toForm(target));
    setMessage(null);
  };

  const uploadImage = async (field: 'cover' | 'logo', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const error = validateImage(file);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as { id?: string };
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setField(field, uploaded.id);
      setMessage({ text: '图片上传成功，保存后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '图片上传失败。', type: 'error' });
    } finally {
      setUploadingField('');
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const error = validate(form);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    const maxSort = items.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
    const payload = {
      name: form.name?.trim(),
      short_name: form.short_name?.trim() || '',
      slug: form.slug?.trim(),
      intro: form.intro?.trim() || '',
      address: form.address?.trim() || '',
      main_business: form.main_business?.trim() || '',
      registered_capital: form.registered_capital?.trim() || '',
      logo: form.logo || null,
      cover: form.cover || null,
      sort: form.id ? Number(form.sort || 0) : (Number(form.sort || 0) || maxSort + 1),
      status: form.status || 'enabled',
    };
    setIsSaving(true);
    try {
      if (form.id) {
        await AdminApi.updateCompany(form.id, payload);
        setMessage({ text: '公司信息已更新。', type: 'success' });
      } else {
        await AdminApi.createCompany(payload);
        setMessage({ text: '公司已新增。', type: 'success' });
        setForm(emptyForm());
      }
      await loadCompanies();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存公司失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const editCompany = (row: CompanyRow) => {
    setForm(toForm(row));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCompany = async (row: CompanyRow) => {
    const enable = row.status !== 'enabled';
    if (!window.confirm(`确认${enable ? '启用' : '停用'}“${row.name || row.slug}”？停用后前台不再展示。`)) return;
    try {
      await AdminApi.updateCompany(row.id || '', {
        name: row.name || '',
        short_name: row.short_name || '',
        slug: row.slug || '',
        intro: row.intro || '',
        address: row.address || '',
        main_business: row.main_business || '',
        registered_capital: row.registered_capital || '',
        logo: row.logo || null,
        cover: row.cover || null,
        sort: Number(row.sort || 0),
        status: enable ? 'enabled' : 'disabled',
      });
      setMessage({ text: `公司已${enable ? '启用' : '停用'}。`, type: 'success' });
      await loadCompanies();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '公司操作失败。', type: 'error' });
    }
  };

  const deleteCompany = async (row: CompanyRow) => {
    if (!window.confirm('确认删除该公司？此操作不可恢复。')) return;
    try {
      await AdminApi.deleteCompany(row.id || '');
      if (form.id === row.id) resetForm();
      setMessage({ text: '公司已删除。', type: 'success' });
      await loadCompanies();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '删除公司失败。', type: 'error' });
    }
  };

  const moveCompany = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    try {
      await Promise.all(next.map((row, rowIndex) => AdminApi.updateCompany(row.id || '', {
        ...toForm(row),
        logo: row.logo || null,
        cover: row.cover || null,
        sort: (rowIndex + 1),
      })));
      await loadCompanies();
      setMessage({ text: '排序已更新。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '排序调整失败。', type: 'error' });
    }
  };

  if (mode === 'intro') {
    return (
      <main className="dashboard-content">
        <section className="notice-card">
          <div className="section-title-row">
            <div><p className="eyebrow">下属公司</p><h2>{moduleTitle || '公司简介'}</h2></div>
          </div>
          <p>选择一家公司，维护它在详情页展示的简介、主营业务、注册地址、注册资本和图片。新增或删除公司请到“公司列表”。</p>
        </section>
        <section className="editor-card">
          {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
          {isLoading ? <p className="form-help-text">正在加载...</p> : null}
          {!isLoading && !items.length ? <p className="form-help-text">暂无公司记录，请先在“公司列表”中新增。</p> : null}
          {items.length ? (
            <label style={{ display: 'block', maxWidth: 420, marginBottom: 12 }}>选择公司
              <select value={selectedId} onChange={(event) => selectCompany(event.target.value)}>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name || item.slug}</option>)}
              </select>
            </label>
          ) : null}
          {form.id ? (
            <form className="editor-grid" onSubmit={handleSave}>
              <label>公司名称
                <input type="text" value={form.name || ''} readOnly disabled />
              </label>
              <label>slug
                <input type="text" value={form.slug || ''} readOnly disabled />
              </label>
              <label className="span-2">公司简介
                <textarea rows={5} maxLength={1000} value={form.intro || ''} onChange={(event) => setField('intro', event.target.value)} />
              </label>
              <label className="span-2">主营业务
                <input type="text" maxLength={128} value={form.main_business || ''} onChange={(event) => setField('main_business', event.target.value)} />
              </label>
              <label className="span-2">注册地址
                <input type="text" maxLength={128} value={form.address || ''} onChange={(event) => setField('address', event.target.value)} />
              </label>
              <label>注册资本
                <input type="text" maxLength={64} value={form.registered_capital || ''} onChange={(event) => setField('registered_capital', event.target.value)} />
              </label>
              <label>状态
                <select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}>
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </label>
              <div className="cover-field">
                <label>封面图</label>
                <p className="field-tip">列表卡片使用，支持 JPG、PNG、WEBP，单个文件不超过 50MB。</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage('cover', event)} disabled={uploadingField === 'cover'} />
                {form.cover ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.cover)}`} alt="封面预览" /> : null}
              </div>
              <div className="cover-field">
                <label>Logo</label>
                <p className="field-tip">详情页与列表标签使用。</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage('logo', event)} disabled={uploadingField === 'logo'} />
                {form.logo ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.logo)}`} alt="Logo 预览" /> : null}
              </div>
              <div className="form-actions span-2">
                <button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : '保存公司详情'}</button>
              </div>
            </form>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <div className="section-title-row">
          <div><p className="eyebrow">下属公司</p><h2>{moduleTitle || '公司列表管理'}</h2></div>
        </div>
        <p>公司信息保存到 <code>companies</code> 表，前台下属公司页面展示已启用的记录；排序值越小越靠前。停用只影响前台展示，不删除数据。</p>
      </section>

      <section className="editor-card">
          <div className="section-title-row">
            <div><p className="eyebrow">新增 / 编辑</p><h2>{form.id ? '编辑公司' : '新增公司'}</h2></div>
            <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
          </div>
          {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
          <form className="editor-grid" onSubmit={handleSave}>
            <label>公司名称 <span className="required">*</span>
              <input type="text" maxLength={64} required value={form.name || ''} onChange={(event) => setField('name', event.target.value)} />
            </label>
            <label>简称
              <input type="text" maxLength={32} value={form.short_name || ''} onChange={(event) => setField('short_name', event.target.value)} />
            </label>
            <label>slug <span className="required">*</span>
              <input type="text" maxLength={64} required placeholder="例如 tianlu-construction" value={form.slug || ''} onChange={(event) => setField('slug', event.target.value)} />
            </label>
            <label>注册资本
              <input type="text" maxLength={64} value={form.registered_capital || ''} onChange={(event) => setField('registered_capital', event.target.value)} />
            </label>
            <label className="span-2">主营业务
              <input type="text" maxLength={128} value={form.main_business || ''} onChange={(event) => setField('main_business', event.target.value)} />
            </label>
            <label className="span-2">地址
              <input type="text" maxLength={128} value={form.address || ''} onChange={(event) => setField('address', event.target.value)} />
            </label>
            <label className="span-2">公司简介
              <textarea rows={4} maxLength={1000} value={form.intro || ''} onChange={(event) => setField('intro', event.target.value)} />
            </label>
            <div className="cover-field">
              <label>封面图</label>
              <p className="field-tip">列表卡片使用，支持 JPG、PNG、WEBP，单个文件不超过 50MB。</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage('cover', event)} disabled={uploadingField === 'cover'} />
              {form.cover ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.cover)}`} alt="封面预览" /> : null}
            </div>
            <div className="cover-field">
              <label>Logo</label>
              <p className="field-tip">详情页与列表标签使用。</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage('logo', event)} disabled={uploadingField === 'logo'} />
              {form.logo ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.logo)}`} alt="Logo 预览" /> : null}
            </div>
            <label>排序
              <input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} />
            </label>
            <label>状态
              <select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <div className="form-actions span-2">
              <button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '保存中…' : '保存公司'}</button>
            </div>
          </form>
        </section>

        <section className="table-card" aria-live="polite">
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>名称</th><th>Slug</th><th>状态</th><th>排序</th><th>操作</th></tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5}>正在加载...</td></tr>
                ) : items.length ? items.map((row, index) => (
                  <tr key={row.id || row.slug}>
                    <td>{row.name || '未命名'}</td>
                    <td>{row.slug || '-'}</td>
                    <td><span className={`status-badge ${row.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{row.status === 'enabled' ? '启用' : '停用'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" type="button" onClick={() => moveCompany(index, -1)} disabled={index === 0}>上移</button>
                        <span>{Number(row.sort || 0)}</span>
                        <button className="text-button" type="button" onClick={() => moveCompany(index, 1)} disabled={index === items.length - 1}>下移</button>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" type="button" onClick={() => editCompany(row)}>编辑</button>
                        <button className="text-button" type="button" onClick={() => toggleCompany(row)}>{row.status === 'enabled' ? '停用' : '启用'}</button>
                        <button className="text-button" type="button" onClick={() => deleteCompany(row)}>删除</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>暂无公司记录，请在上方表单新增。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
    </main>
  );
}
