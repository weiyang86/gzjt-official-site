'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContent, PageModule, UploadPayload } from './types';

export const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const maxImageBytes = 50 * 1024 * 1024;

export const emptyPageContent = (moduleCode = ''): PageContent => ({
  module_code: moduleCode,
  title: '',
  subtitle: '',
  cover: null,
  summary: '',
  content: '',
  extra_json: {},
  status: 'draft',
});

export const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 50MB。';
  return '';
};

export const moduleConfig = (module: PageModule) => {
  const base = {
    titleLabel: '页面标题',
    subtitleLabel: '副标题',
    coverLabel: '封面图',
    summaryLabel: '摘要',
    contentLabel: '正文 / 说明',
    submitText: '保存内容',
    showSubtitle: true,
    showSummary: true,
    showCover: true,
    bodyRows: 10,
    introText: '',
  };
  if (module.module_code === 'group-intro') {
    return {
      ...base,
      introText: '企业简介保存到 page_contents.module_code = group-intro，可维护页面标题、副标题、封面图、摘要、正文和发布状态。',
      coverLabel: '企业简介封面图',
      contentLabel: '企业简介正文',
    };
  }
  if (module.module_code === 'group-history') {
    return {
      ...base,
      introText: '发展历程由页面基础信息和时间轴条目组成；条目保存到 page_content_items.module_code = group-history，item_type = timeline。',
      showSubtitle: false,
      showCover: false,
      summaryLabel: '页面说明',
      contentLabel: '补充说明',
      bodyRows: 5,
      submitText: '保存页面基础信息',
    };
  }
  if (module.module_code === 'org-chart') {
    return {
      ...base,
      introText: '组织架构图图片保存到 page_contents.cover，说明文字保存到 page_contents.content。',
      showSubtitle: false,
      showSummary: false,
      coverLabel: '组织架构图图片',
      contentLabel: '组织架构说明文字',
      bodyRows: 7,
    };
  }
  return base;
};

export function PageContentForm({ module, options = {} }: {
  module: PageModule;
  options?: Partial<ReturnType<typeof moduleConfig>>;
}) {
  const config = useMemo(() => ({ ...moduleConfig(module), ...options }), [module, options]);
  const moduleCode = module.module_code || '';
  const [form, setForm] = useState<PageContent>(() => emptyPageContent(moduleCode));
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setMessage(null);
    AdminApi.pageContent(moduleCode)
      .then((result) => {
        if (!isMounted) return;
        setForm({ ...emptyPageContent(moduleCode), ...((result.data || {}) as PageContent) });
      })
      .catch((err) => {
        if (!isMounted) return;
        setMessage({ text: err instanceof Error ? err.message : '页面内容加载失败。', type: 'error' });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [moduleCode]);

  const setField = (field: keyof PageContent, value: string | Record<string, unknown> | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const error = validateImage(file);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setField('cover', uploaded.id);
      setMessage({ text: '图片上传成功，保存内容后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '图片上传失败，请确认 Directus Files 权限和服务状态。', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await AdminApi.savePageContent(moduleCode, {
        title: String(form.title || '').trim(),
        subtitle: String(form.subtitle || '').trim(),
        cover: form.cover || null,
        summary: String(form.summary || '').trim(),
        content: String(form.content || ''),
        extra_json: form.extra_json || {},
        status: form.status || 'draft',
      });
      setMessage({ text: '内容已保存到 Directus。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存失败，请确认 Directus 服务可用且账号有 page_contents 权限。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const showCover = config.showCover !== false;
  const showSubtitle = config.showSubtitle !== false;
  const showSummary = config.showSummary !== false;

  return (
    <form className="editor-card content-form-card" onSubmit={handleSubmit}>
      <div className="section-title-row">
        <div>
          <p className="eyebrow">{module.parent_title} · {module.module_code}</p>
          <h2>{module.module_title}</h2>
        </div>
        <span className="status-badge status-published">{module.content_type}</span>
      </div>
      {config.introText ? <p className="form-help-text">{config.introText}</p> : null}
      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
      <div className="editor-grid">
        <label>{config.titleLabel}
          <input type="text" required value={form.title || ''} onChange={(event) => setField('title', event.target.value)} />
        </label>
        {showSubtitle ? (
          <label>{config.subtitleLabel}
            <input type="text" value={form.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} />
          </label>
        ) : null}
        {showCover ? (
          <div className="cover-field span-2">
            <label>{config.coverLabel}</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB；上传通过 /admin-api/files 代理到 Directus Files。</p>
            <div className="cover-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={isUploading} />
              <input type="hidden" value={form.cover || ''} readOnly />
            </div>
            {form.cover ? <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.cover)}`} alt="图片预览" /> : null}
          </div>
        ) : null}
        {showSummary ? (
          <label className="span-2">{config.summaryLabel}
            <textarea rows={3} value={form.summary || ''} onChange={(event) => setField('summary', event.target.value)} />
          </label>
        ) : null}
        <label className="span-2">{config.contentLabel}
          <textarea className="content-editor" rows={config.bodyRows} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} />
        </label>
        <label>发布状态
          <select value={form.status || 'draft'} onChange={(event) => setField('status', event.target.value)}>
            {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-link-button" type="submit" disabled={isSaving || isLoading}>{isSaving ? '正在保存...' : config.submitText}</button>
      </div>
    </form>
  );
}
