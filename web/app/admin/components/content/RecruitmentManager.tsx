'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import { CmsRichTextEditor, type CmsRichTextEditorHandle } from '../editor/CmsRichTextEditor';
import type { MessageState, PageContentItem, PageModule } from './types';
import type { RecruitmentCategory } from '@/types/cms';

const moduleCode = 'recruitment';
const itemType = 'job';
const maxUploadBytes = 50 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const categoryOptions: Array<{ value: RecruitmentCategory; label: string }> = [
  { value: 'social', label: '社会招聘' },
  { value: 'campus', label: '校园招聘' },
  { value: 'internal', label: '内部选聘' },
];
const statusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
];

const categoryLabel = (value: string) => categoryOptions.find((option) => option.value === value)?.label || '社会招聘';

type JobForm = {
  id: string;
  category: RecruitmentCategory;
  title: string;
  department: string;
  headcount: string;
  location: string;
  deadline: string;
  applyUrl: string;
  content: string;
  sort: number;
  status: string;
};

const emptyForm = (sort = 0, category: RecruitmentCategory = 'social'): JobForm => ({
  id: '',
  category,
  title: '',
  department: '',
  headcount: '',
  location: '',
  deadline: '',
  applyUrl: '',
  content: '',
  sort,
  status: 'enabled',
});

const readExtraObject = (item?: PageContentItem): Record<string, unknown> => (
  item && item.extra_json && typeof item.extra_json === 'object' && !Array.isArray(item.extra_json)
    ? item.extra_json as Record<string, unknown>
    : {}
);

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const toCategory = (value: unknown): RecruitmentCategory => {
  const category = toText(value);
  return category === 'campus' || category === 'internal' ? category : 'social';
};

const toForm = (item: PageContentItem): JobForm => {
  const extra = readExtraObject(item);
  return {
    id: item.id,
    category: toCategory(extra.category),
    title: item.title || '',
    department: item.subtitle || '',
    headcount: toText(extra.headcount),
    location: toText(extra.location),
    deadline: item.date_label || '',
    applyUrl: item.link_url || '',
    content: item.content || '',
    sort: Number(item.sort) || 0,
    status: item.status || 'enabled',
  };
};

const buildPayload = (
  form: JobForm,
  content: string,
  status = form.status,
  extra: Record<string, unknown> = {},
  sort = Number(form.sort) || 0,
) => ({
  module_code: moduleCode,
  item_type: itemType,
  title: form.title.trim(),
  subtitle: form.department.trim(),
  date_label: form.deadline.trim(),
  content,
  link_url: form.applyUrl.trim(),
  sort,
  status,
  extra_json: {
    ...extra,
    category: form.category,
    headcount: form.headcount.trim(),
    location: form.location.trim(),
  },
});

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxUploadBytes) return '图片大小不能超过 50MB。';
  return '';
};

export function RecruitmentManager({ module }: { module: PageModule }) {
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<JobForm>(() => emptyForm());
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<CmsRichTextEditorHandle | null>(null);

  // 切换岗位或清空表单时同步编辑器内容，避免沿用上一条岗位的正文。
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getHtml() === form.content) return;
    editor.setHtml(form.content || '');
  }, [form.content]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode, item_type: itemType });
      const rows = ((result.data || []) as PageContentItem[])
        .filter((item) => item.item_type === itemType)
        .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      setItems(rows);
      return rows;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '招聘岗位加载失败。', type: 'error' });
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

  const setField = <K extends keyof JobForm>(key: K, value: JobForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm(nextSort, form.category));
    setMessage(null);
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

  const selectItem = (item: PageContentItem) => {
    setForm(toForm(item));
    setMessage(null);
    document.getElementById('recruitment-job-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage({ text: '请填写岗位名称。', type: 'error' });
      return;
    }
    if (form.applyUrl.trim().length > 255) {
      setMessage({ text: '报名地址不能超过 255 个字符。', type: 'error' });
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
        setMessage({ text: '招聘岗位已更新。', type: 'success' });
        await loadItems();
      } else {
        await AdminApi.createPageContentItem(payload);
        setMessage({ text: '招聘岗位已新增。', type: 'success' });
        const rows = await loadItems();
        const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
        setForm(emptyForm(maxSort + 1, form.category));
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存招聘岗位失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: PageContentItem) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    const label = nextStatus === 'enabled' ? '启用' : '停用';
    if (!window.confirm(`确认${label}“${item.title || '该岗位'}”？`)) return;
    try {
      const source = toForm(item);
      await AdminApi.updatePageContentItem(item.id, buildPayload(source, source.content, nextStatus, readExtraObject(item)));
      setMessage({ text: `岗位已${label}。`, type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : `${label}失败。`, type: 'error' });
    }
  };

  const moveItem = async (item: PageContentItem, direction: -1 | 1) => {
    const index = items.findIndex((row) => row.id === item.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const target = items[targetIndex];
    const currentSort = Number(item.sort) || 0;
    const targetSort = Number(target.sort) || 0;
    try {
      if (currentSort !== targetSort) {
        // 只交换相邻两条岗位的排序值，避免整组重写。
        const source = toForm(item);
        const other = toForm(target);
        await Promise.all([
          AdminApi.updatePageContentItem(item.id, buildPayload(source, source.content, source.status, readExtraObject(item), targetSort)),
          AdminApi.updatePageContentItem(target.id, buildPayload(other, other.content, other.status, readExtraObject(target), currentSort)),
        ]);
      } else {
        // 排序值相同时按当前顺序整体重编号，保证上移/下移生效。
        const next = [...items];
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
      <section className="editor-card" id="recruitment-job-editor">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{module.module_title || '人才招聘'} · page_content_items</p>
            <h2>{form.id ? '编辑招聘岗位' : '新增招聘岗位'}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
        </div>
        <p className="form-help-text">
          岗位保存到 page_content_items，module_code 固定为 recruitment，item_type 固定为 job；
          岗位分类、人数和工作地点保存到 extra_json，前台只展示启用状态的岗位。
        </p>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={handleSubmit}>
          <label>岗位分类
            <select
              value={form.category}
              onChange={(event) => setField('category', event.target.value as RecruitmentCategory)}
            >
              {categoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>有效期
            <input type="text" maxLength={50} placeholder="例如：2026-11-30" value={form.deadline} onChange={(event) => setField('deadline', event.target.value)} />
          </label>
          <label className="span-2">岗位名称 <span className="required">*</span>
            <input type="text" required maxLength={255} value={form.title} onChange={(event) => setField('title', event.target.value)} />
          </label>
          <label>部门
            <input type="text" maxLength={255} value={form.department} onChange={(event) => setField('department', event.target.value)} />
          </label>
          <label>招聘人数
            <input type="text" maxLength={50} placeholder="例如：2人" value={form.headcount} onChange={(event) => setField('headcount', event.target.value)} />
          </label>
          <label>工作地点
            <input type="text" maxLength={255} value={form.location} onChange={(event) => setField('location', event.target.value)} />
          </label>
          <label>报名地址
            <input type="text" maxLength={255} placeholder="报名网址或接收简历的邮箱" value={form.applyUrl} onChange={(event) => setField('applyUrl', event.target.value)} />
          </label>
          <div className="span-2">
            <p className="field-tip" style={{ marginBottom: 8 }}>岗位要求</p>
            <CmsRichTextEditor
              value={form.content}
              onChange={(html) => setField('content', html)}
              onReady={(handle) => { editorRef.current = handle; }}
              uploadImage={uploadDetailImage}
              minHeight={240}
              placeholder="请输入岗位职责、任职资格等要求"
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
            <button className="primary-link-button" type="submit" disabled={isSaving}>
              {isSaving ? '正在保存...' : form.id ? '保存修改' : '新增岗位'}
            </button>
            {form.id ? <button className="secondary-button" type="button" onClick={resetForm}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <div><p className="eyebrow">已维护岗位</p><h2>招聘岗位列表</h2></div>
          <span className="meta">共 {items.length} 个岗位</span>
        </div>
        {isLoading ? <p className="form-help-text">正在加载...</p> : items.length ? (
          <div className="timeline-list">
            {items.map((item) => {
              const position = items.findIndex((row) => row.id === item.id);
              const extra = readExtraObject(item);
              const meta = [
                item.subtitle ? `部门：${item.subtitle}` : '',
                toText(extra.headcount) ? `人数：${toText(extra.headcount)}` : '',
                toText(extra.location) ? `地点：${toText(extra.location)}` : '',
                item.date_label ? `有效期：${item.date_label}` : '',
              ].filter(Boolean);
              return (
                <article className="timeline-item-card" key={item.id}>
                  <div>
                    <strong>{categoryLabel(toCategory(extra.category))}</strong>
                    <h3>{item.title}</h3>
                    {meta.length ? <p>{meta.join(' · ')}</p> : null}
                    <small>
                      排序：{String(item.sort ?? 0)} / 状态：{item.status === 'enabled' ? '启用' : '停用'}
                    </small>
                  </div>
                  <div className="table-actions">
                    <button className="text-button" type="button" onClick={() => selectItem(item)}>编辑</button>
                    <button className="text-button" type="button" disabled={position <= 0} onClick={() => moveItem(item, -1)}>上移</button>
                    <button className="text-button" type="button" disabled={position < 0 || position >= items.length - 1} onClick={() => moveItem(item, 1)}>下移</button>
                    <button className="text-button" type="button" onClick={() => toggleStatus(item)}>
                      {item.status === 'enabled' ? '停用' : '启用'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="form-help-text">暂无招聘岗位，请先新增一条岗位。</p>
        )}
      </section>
    </div>
  );
}
