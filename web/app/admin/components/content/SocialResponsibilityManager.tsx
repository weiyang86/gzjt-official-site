'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import { CmsRichTextEditor, type CmsRichTextEditorHandle } from '../editor/CmsRichTextEditor';
import { PageContentForm } from './PageContentForm';
import type { MessageState, PageContentItem, PageModule } from './types';
import type { ResponsibilityAttachment, ResponsibilityCategory } from '@/types/cms';

const moduleCode = 'social-responsibility';
const categoryOptions: Array<{ value: ResponsibilityCategory; label: string }> = [
  { value: 'report', label: '责任报告' },
  { value: 'case', label: '实践案例' },
  { value: 'activity', label: '公益活动' },
];
const categoryLabel = (value: string) => categoryOptions.find((option) => option.value === value)?.label || '未分类';
const statusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
];
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedAttachmentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const maxUploadBytes = 50 * 1024 * 1024;

type ItemForm = {
  id: string;
  category: ResponsibilityCategory;
  title: string;
  summary: string;
  year: string;
  image: string;
  content: string;
  link_url: string;
  attachments: ResponsibilityAttachment[];
  sort: number;
  status: string;
};

const emptyForm = (sort = 0, category: ResponsibilityCategory = 'report'): ItemForm => ({
  id: '',
  category,
  title: '',
  summary: '',
  year: '',
  image: '',
  content: '',
  link_url: '',
  attachments: [],
  sort,
  status: 'enabled',
});

const readAttachments = (item: PageContentItem): ResponsibilityAttachment[] => {
  const extra = item.extra_json;
  if (!extra || typeof extra !== 'object') return [];
  const rows = (extra as Record<string, unknown>).attachments;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (typeof row === 'string') return [{ id: row, name: row }];
    if (!row || typeof row !== 'object') return [];
    const value = row as Record<string, unknown>;
    const id = typeof value.id === 'string' ? value.id : typeof value.file === 'string' ? value.file : '';
    if (!id) return [];
    const size = Number(value.size);
    return [{
      id,
      name: typeof value.name === 'string' && value.name ? value.name : id,
      ...(Number.isFinite(size) && size > 0 ? { size } : {}),
    }];
  });
};

const toForm = (item: PageContentItem): ItemForm => ({
  id: item.id,
  category: (categoryOptions.some((option) => option.value === item.item_type)
    ? item.item_type
    : 'report') as ResponsibilityCategory,
  title: item.title || '',
  summary: item.subtitle || '',
  year: item.date_label || '',
  image: item.image || '',
  content: item.content || '',
  link_url: item.link_url || '',
  attachments: readAttachments(item),
  sort: Number(item.sort) || 0,
  status: item.status || 'enabled',
});

const readExtraObject = (item?: PageContentItem): Record<string, unknown> => (
  item && item.extra_json && typeof item.extra_json === 'object' && !Array.isArray(item.extra_json)
    ? item.extra_json as Record<string, unknown>
    : {}
);

const buildPayload = (
  form: ItemForm,
  content: string,
  status = form.status,
  extra: Record<string, unknown> = {},
  sort = Number(form.sort) || 0,
) => ({
  module_code: moduleCode,
  item_type: form.category,
  date_label: form.year.trim(),
  title: form.title.trim(),
  subtitle: form.summary.trim(),
  image: form.image || null,
  content,
  link_url: form.link_url.trim(),
  sort,
  status,
  extra_json: { ...extra, attachments: form.attachments },
});

const imageSrc = (value?: string) => {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return value.startsWith('/') ? value : `/admin-api/assets/${encodeURIComponent(value)}`;
};

const attachmentSrc = (attachment: ResponsibilityAttachment) => (
  /^https?:\/\//i.test(attachment.id) ? attachment.id : `/admin-api/assets/${encodeURIComponent(attachment.id)}`
);

const formatSize = (size?: number) => {
  if (!size || size <= 0) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxUploadBytes) return '图片大小不能超过 50MB。';
  return '';
};

const validateAttachment = (file: File) => {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  if (!allowedAttachmentExtensions.includes(extension)) return '附件仅支持 PDF、Word、Excel 文件。';
  if (file.size > maxUploadBytes) return '附件大小不能超过 50MB。';
  return '';
};

export function SocialResponsibilityManager({ module }: { module: PageModule }) {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<ItemForm>(() => emptyForm());
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResponsibilityCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<CmsRichTextEditorHandle | null>(null);

  // 切换条目或清空表单时同步编辑器内容，避免沿用上一条目的正文。
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getHtml() === form.content) return;
    editor.setHtml(form.content || '');
  }, [form.content]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode });
      const rows = ((result.data || []) as PageContentItem[])
        .filter((item) => categoryOptions.some((option) => option.value === item.item_type))
        .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      setItems(rows);
      return rows;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '责任内容加载失败。', type: 'error' });
      setItems([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const nextSort = useMemo(
    () => items.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0) + 1,
    [items],
  );

  const visibleItems = useMemo(
    () => items.filter((item) => (
      (categoryFilter === 'all' || item.item_type === categoryFilter)
      && (statusFilter === 'all' || item.status === statusFilter)
    )),
    [items, categoryFilter, statusFilter],
  );

  const counts = useMemo(() => ({
    report: items.filter((item) => item.item_type === 'report').length,
    case: items.filter((item) => item.item_type === 'case').length,
    activity: items.filter((item) => item.item_type === 'activity').length,
  }), [items]);

  const setField = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm(nextSort, form.category));
    setMessage(null);
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
      setField('image', uploaded.id);
      setMessage({ text: '封面图已上传，保存后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '封面图上传失败。', type: 'error' });
    } finally {
      input.value = '';
      setIsUploading(false);
    }
  };

  const uploadDetailImage = async (file: File) => {
    const error = validateImage(file);
    if (error) throw new Error(error);
    const formData = new FormData();
    formData.append('file', file);
    const result = await AdminApi.uploadFile(formData);
    const uploaded = (result.data || {}) as { id?: string; filename?: string };
    if (!uploaded.id) throw new Error('上传成功但未返回文件信息。');
    return {
      url: `/api/public/cms/assets/${encodeURIComponent(uploaded.id)}`,
      filename: uploaded.filename || file.name,
    };
  };

  const uploadAttachments = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    setIsUploading(true);
    setMessage(null);
    const uploadedRows: ResponsibilityAttachment[] = [];
    try {
      for (const file of files) {
        const error = validateAttachment(file);
        if (error) throw new Error(`${file.name}：${error}`);
        const formData = new FormData();
        formData.append('file', file);
        const result = await AdminApi.uploadFile(formData);
        const uploaded = (result.data || {}) as { id?: string; filename?: string; filesize?: number };
        if (!uploaded.id) throw new Error(`${file.name} 上传成功但未返回文件 ID。`);
        uploadedRows.push({
          id: uploaded.id,
          name: uploaded.filename || file.name,
          ...(uploaded.filesize ? { size: uploaded.filesize } : {}),
        });
      }
      setForm((current) => ({ ...current, attachments: [...current.attachments, ...uploadedRows] }));
      setMessage({ text: `已上传 ${uploadedRows.length} 个附件，保存后生效。`, type: 'success' });
    } catch (err) {
      if (uploadedRows.length) {
        setForm((current) => ({ ...current, attachments: [...current.attachments, ...uploadedRows] }));
      }
      setMessage({ text: err instanceof Error ? err.message : '附件上传失败。', type: 'error' });
    } finally {
      input.value = '';
      setIsUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id),
    }));
  };

  const selectItem = (item: PageContentItem) => {
    setForm(toForm(item));
    setMessage(null);
    document.getElementById('responsibility-item-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage({ text: '请填写标题。', type: 'error' });
      return;
    }
    if (form.link_url.trim().length > 255) {
      setMessage({ text: '外部链接不能超过 255 个字符。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    // 编辑器内容有节流，保存时取实时内容，避免刚输入的文字丢失。
    const content = editorRef.current ? editorRef.current.getHtml() : form.content;
    const existing = items.find((item) => item.id === form.id);
    const payload = buildPayload(form, content, form.status, readExtraObject(existing));
    try {
      if (form.id) {
        await AdminApi.updatePageContentItem(form.id, payload);
        setMessage({ text: '责任内容已更新。', type: 'success' });
        await loadItems();
      } else {
        await AdminApi.createPageContentItem(payload);
        setMessage({ text: '责任内容已新增。', type: 'success' });
        const rows = await loadItems();
        const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
        setForm(emptyForm(maxSort + 1, form.category));
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存责任内容失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    const label = nextStatus === 'enabled' ? '启用' : '停用';
    if (!window.confirm(`确认${label}“${item.title || '该条目'}”？`)) return;
    try {
      const source = toForm(item);
      await AdminApi.updatePageContentItem(item.id, buildPayload(source, source.content, nextStatus, readExtraObject(item)));
      setMessage({ text: `条目已${label}。`, type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : `${label}失败。`, type: 'error' });
    }
  };

  const removeItem = async (item: PageContentItem) => {
    if (!window.confirm(`确认删除“${item.title || '该条目'}”？删除后不可恢复，只想在前台隐藏请改用停用。`)) return;
    try {
      await AdminApi.deletePageContentItem(item.id);
      if (form.id === item.id) setForm(emptyForm(nextSort, form.category));
      setMessage({ text: '责任内容已删除。', type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '删除责任内容失败。', type: 'error' });
    }
  };

  const moveItem = async (item: PageContentItem, direction: -1 | 1) => {
    const siblings = visibleItems.filter((row) => row.item_type === item.item_type);
    const index = siblings.findIndex((row) => row.id === item.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    const target = siblings[targetIndex];
    const currentSort = Number(item.sort) || 0;
    const targetSort = Number(target.sort) || 0;
    try {
      if (currentSort !== targetSort) {
        // 只交换同分类相邻两条的排序值，避免整组重写。
        const source = toForm(item);
        const other = toForm(target);
        await Promise.all([
          AdminApi.updatePageContentItem(item.id, buildPayload(source, source.content, source.status, readExtraObject(item), targetSort)),
          AdminApi.updatePageContentItem(target.id, buildPayload(other, other.content, other.status, readExtraObject(target), currentSort)),
        ]);
      } else {
        // 排序值相同时按当前顺序整体重编号，保证上移/下移生效。
        const next = [...siblings];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        await Promise.all(next.map((row, rowIndex) => {
          const source = toForm(row);
          return AdminApi.updatePageContentItem(row.id, buildPayload(source, source.content, source.status, readExtraObject(row), rowIndex + 1));
        }));
      }
      setMessage({ text: '排序已更新。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '排序调整失败。', type: 'error' });
    } finally {
      await loadItems();
    }
  };

  return (
    <div className="content-editor-root">
      <PageContentForm
        module={module}
        options={{
          introText: '页面主体保存到 page_contents.module_code = social-responsibility，前台只展示已发布内容。',
          titleLabel: '页面标题',
          subtitleLabel: '页面副标题',
          coverLabel: '页面封面图',
          summaryLabel: '页面摘要',
          contentLabel: '责任体系正文',
          submitText: '保存页面主体',
        }}
      />

      <section className="editor-card" id="responsibility-item-editor">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">page_content_items · 社会责任</p>
            <h2>{form.id ? '编辑责任内容' : '新增责任内容'}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
        </div>
        <p className="form-help-text">
          报告、实践案例、公益活动均保存到 page_content_items，module_code 固定为 social-responsibility，
          item_type 分别为 report、case、activity；附件保存到 extra_json.attachments，前台提供下载。
        </p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={handleSubmit}>
          <label>内容分类
            <select
              value={form.category}
              onChange={(event) => setField('category', event.target.value as ResponsibilityCategory)}
            >
              {categoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>年份或日期
            <input type="text" maxLength={50} placeholder="例如：2025" value={form.year} onChange={(event) => setField('year', event.target.value)} />
          </label>
          <label className="span-2">标题 <span className="required">*</span>
            <input type="text" required maxLength={255} value={form.title} onChange={(event) => setField('title', event.target.value)} />
          </label>
          <label className="span-2">摘要
            <textarea rows={3} maxLength={500} value={form.summary} onChange={(event) => setField('summary', event.target.value)} />
          </label>
          <label className="span-2">外部链接（可选）
            <input type="url" maxLength={255} placeholder="https:// 开头的报告原文或相关报道地址" value={form.link_url} onChange={(event) => setField('link_url', event.target.value)} />
          </label>
          <div className="cover-field span-2">
            <label>封面图（可选）</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB；上传后保存生效。</p>
            <div className="cover-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={isUploading} />
            </div>
            {form.image ? (
              <div className="cover-preview-wrap">
                <img className="cover-preview" src={imageSrc(form.image)} alt="封面图预览" />
                <button className="secondary-button" type="button" onClick={() => setField('image', '')}>移除图片</button>
              </div>
            ) : null}
          </div>
          <div className="cover-field span-2">
            <label>附件（PDF、Word、Excel，可多选）</label>
            <p className="field-tip">用于责任报告原文等下载；单文件不超过 50MB，可一次选择多个文件。</p>
            <div className="cover-upload-row">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={uploadAttachments}
                disabled={isUploading}
              />
            </div>
            {form.attachments.length ? (
              <div className="attachment-list" style={{ marginTop: 12 }}>
                {form.attachments.map((attachment) => (
                  <div className="attach" key={attachment.id}>
                    <span>
                      <b>{attachment.name}</b>
                      {attachment.size ? <><br /><small>{formatSize(attachment.size)}</small></> : null}
                    </span>
                    <div className="table-actions">
                      <a className="text-button" href={attachmentSrc(attachment)} target="_blank" rel="noreferrer">查看</a>
                      <button className="text-button" type="button" onClick={() => removeAttachment(attachment.id)}>移除</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="span-2">
            <p className="field-tip" style={{ marginBottom: 8 }}>正文详情（可选）</p>
            <CmsRichTextEditor
              value={form.content}
              onChange={(html) => setField('content', html)}
              onReady={(handle) => { editorRef.current = handle; }}
              uploadImage={uploadDetailImage}
              minHeight={260}
              placeholder="请输入报告说明、案例或活动详情"
            />
          </div>
          <label>排序
            <input type="number" value={String(form.sort)} onChange={(event) => setField('sort', Number(event.target.value || 0))} />
          </label>
          <label>状态
            <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
              {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploading}>
              {isSaving ? '正在保存...' : form.id ? '保存修改' : '新增内容'}
            </button>
            {form.id ? <button className="secondary-button" type="button" onClick={resetForm}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">已维护内容</p><h2>责任内容列表</h2></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label>分类筛选
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'all' | ResponsibilityCategory)}>
                <option value="all">全部（{items.length}）</option>
                {categoryOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}（{counts[option.value]}）</option>
                ))}
              </select>
            </label>
            <label>状态筛选
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'enabled' | 'disabled')}>
                <option value="all">全部</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
          </div>
        </div>
        {isLoading ? <p className="form-help-text">正在加载...</p> : visibleItems.length ? (
          <div className="timeline-list">
            {visibleItems.map((item) => {
              const siblings = visibleItems.filter((row) => row.item_type === item.item_type);
              const position = siblings.findIndex((row) => row.id === item.id);
              return (
                <article className="timeline-item-card" key={item.id}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {item.image ? (
                      <img
                        className="cover-preview"
                        style={{ width: 120, height: 76, objectFit: 'cover', flex: '0 0 auto' }}
                        src={imageSrc(item.image)}
                        alt=""
                      />
                    ) : null}
                    <div>
                      <strong>{categoryLabel(item.item_type || '')} {item.date_label ? `· ${item.date_label}` : ''}</strong>
                      <h3>{item.title}</h3>
                      {item.subtitle ? <p>{item.subtitle}</p> : null}
                      <small>
                        排序：{String(item.sort ?? 0)} / 状态：{item.status === 'enabled' ? '启用' : '停用'}
                        {readAttachments(item).length ? ` / 附件：${readAttachments(item).length} 个` : ''}
                      </small>
                    </div>
                  </div>
                  <div className="table-actions">
                    <button className="text-button" type="button" onClick={() => selectItem(item)}>编辑</button>
                    <button className="text-button" type="button" disabled={position <= 0} onClick={() => moveItem(item, -1)}>上移</button>
                    <button className="text-button" type="button" disabled={position < 0 || position >= siblings.length - 1} onClick={() => moveItem(item, 1)}>下移</button>
                    <button className="text-button" type="button" onClick={() => toggleStatus(item)}>
                      {item.status === 'enabled' ? '停用' : '启用'}
                    </button>
                    <button className="text-button is-danger" type="button" onClick={() => void removeItem(item)}>删除</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="form-help-text">
            {items.length ? '没有符合筛选条件的内容。' : '暂无责任内容，请先新增一条报告、实践案例或公益活动。'}
          </p>
        )}
      </section>
    </div>
  );
}
