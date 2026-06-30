'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageContent, PageContentItem, PageModule, PageModuleGroup, UploadPayload } from './types';

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

const itemStatusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
];

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 10 * 1024 * 1024;

const emptyPageContent = (moduleCode = ''): PageContent => ({
  module_code: moduleCode,
  title: '',
  subtitle: '',
  cover: null,
  summary: '',
  content: '',
  extra_json: {},
  status: 'draft',
});

const emptyTimelineItem = (moduleCode = ''): PageContentItem => ({
  id: '',
  module_code: moduleCode,
  item_type: 'timeline',
  date_label: '',
  title: '',
  content: '',
  sort: 0,
  status: 'enabled',
  extra_json: {},
});

const moduleConfig = (module: PageModule) => {
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

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 10MB。';
  return '';
};

function PageContentForm({ module, options = {} }: {
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
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 10MB；上传通过 /admin-api/files 代理到 Directus Files。</p>
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

function TimelineManager({ module }: { module: PageModule }) {
  const moduleCode = module.module_code || '';
  const [items, setItems] = useState<PageContentItem[]>([]);
  const [form, setForm] = useState<PageContentItem>(() => emptyTimelineItem(moduleCode));
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await AdminApi.pageContentItems({ module_code: moduleCode, item_type: 'timeline' });
      setItems((result.data || []) as PageContentItem[]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '时间轴条目加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setForm(emptyTimelineItem(moduleCode));
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleCode]);

  const reset = () => {
    setForm(emptyTimelineItem(moduleCode));
  };

  const setField = (field: keyof PageContentItem, value: string | number | Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        module_code: moduleCode,
        item_type: 'timeline',
        date_label: String(form.date_label || '').trim(),
        title: String(form.title || '').trim(),
        content: String(form.content || ''),
        sort: Number(form.sort || 0),
        status: form.status || 'enabled',
        extra_json: {},
      };
      if (form.id) await AdminApi.updatePageContentItem(form.id, payload);
      else await AdminApi.createPageContentItem(payload);
      setMessage({ text: '时间轴条目已保存。', type: 'success' });
      reset();
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存时间轴条目失败，请确认 Directus 服务可用且账号有 page_content_items 权限。', type: 'error' });
    }
  };

  const disableItem = async (id: string) => {
    try {
      await AdminApi.disablePageContentItem(id);
      setMessage({ text: '条目已停用。', type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '停用条目失败，请稍后重试。', type: 'error' });
    }
  };

  return (
    <section className="editor-card timeline-editor-card">
      <div className="section-title-row">
        <div><p className="eyebrow">page_content_items · timeline</p><h2>发展历程时间轴条目</h2></div>
        <button className="secondary-button" type="button" onClick={reset}>新增条目</button>
      </div>
      <p className="form-help-text">时间轴条目保存到 page_content_items，module_code 固定为 {moduleCode}，item_type 固定为 timeline。</p>
      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
      <form className="editor-grid" onSubmit={handleSubmit}>
        <label>年份或时间<input type="text" placeholder="例如 2024 或 2024-06" value={form.date_label || ''} onChange={(event) => setField('date_label', event.target.value)} /></label>
        <label>标题<input type="text" required value={form.title || ''} onChange={(event) => setField('title', event.target.value)} /></label>
        <label className="span-2">内容<textarea rows={4} value={form.content || ''} onChange={(event) => setField('content', event.target.value)} /></label>
        <label>排序<input type="number" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
        <label>状态
          <select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}>
            {itemStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="form-actions span-2"><button className="primary-link-button" type="submit">保存条目</button></div>
      </form>
      <div className="timeline-list">
        {isLoading ? '正在加载...' : items.length ? items.map((item) => (
          <article className="timeline-item-card" key={item.id}>
            <div>
              <strong>{item.date_label || '未填写时间'}</strong>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <small>排序：{String(item.sort ?? 0)} / 状态：{item.status}</small>
            </div>
            <div className="table-actions">
              <button className="text-button" type="button" onClick={() => setForm({ ...emptyTimelineItem(moduleCode), ...item, sort: Number(item.sort || 0), status: item.status || 'enabled' })}>编辑</button>
              <button className="text-button" type="button" onClick={() => disableItem(item.id)}>停用</button>
            </div>
          </article>
        )) : '暂无时间轴条目，请先新增一条发展历程。'}
      </div>
    </section>
  );
}

function ContentModuleEditor({ module }: { module: PageModule | null }) {
  if (!module) {
    return (
      <section className="notice-card">
        <p className="eyebrow">请选择页面</p>
        <h2>从左侧选择一个二级页面</h2>
        <p>后台会根据该模块的 <code>content_type</code> 显示对应维护表单；尚未开放的模块会显示“正在开发中”。</p>
      </section>
    );
  }

  if (!module.admin_enabled) {
    return (
      <section className="notice-card developing-card">
        <p className="eyebrow">{module.parent_title}</p>
        <h2>{module.module_title}</h2>
        <p>{module.placeholder_text || '该模块正在开发中'}</p>
      </section>
    );
  }

  if (module.module_code === 'group-history' || module.content_type === 'timeline') {
    return (
      <>
        <PageContentForm module={module} />
        <TimelineManager module={module} />
      </>
    );
  }

  if (module.module_code === 'org-chart' || module.content_type === 'image_text' || module.content_type === 'org_chart') {
    return <PageContentForm module={module} options={{ showCover: true, showSubtitle: false, showSummary: module.module_code !== 'org-chart' }} />;
  }

  if (module.module_code === 'group-intro' || module.content_type === 'single_page' || module.content_type === 'contact_info') {
    return <PageContentForm module={module} options={{ showCover: module.content_type !== 'contact_info' }} />;
  }

  if (module.content_type === 'article_list') {
    return (
      <section className="notice-card">
        <p className="eyebrow">{module.content_type}</p>
        <h2>内容来源于新闻管理</h2>
        <p>该模块使用新闻管理中的文章列表，建议使用栏目 slug：{module.module_code}。</p>
        <a className="primary-link-button" href={`/admin/articles?channel=${encodeURIComponent(module.module_code || '')}`}>前往新闻管理</a>
      </section>
    );
  }

  if (module.content_type === 'company_list') {
    return <section className="notice-card"><p className="eyebrow">{module.content_type}</p><h2>下属公司数据预留</h2><p>该模块内容来源于下属公司数据，第一阶段保留入口，不影响新闻管理。</p></section>;
  }

  if (module.content_type === 'sector_list') {
    return <section className="notice-card"><p className="eyebrow">{module.content_type}</p><h2>业务板块数据预留</h2><p>该模块内容来源于业务板块数据，具体表单后续接入。</p></section>;
  }

  return (
    <section className="notice-card developing-card">
      <p className="eyebrow">{module.parent_title}</p>
      <h2>{module.module_title}</h2>
      <p>{module.placeholder_text || '该模块正在开发中'}</p>
    </section>
  );
}

export function ContentManagerPage() {
  const [tree, setTree] = useState<PageModuleGroup[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedModule, setSelectedModule] = useState<PageModule | null>(null);
  const [message, setMessage] = useState<MessageState | null>(null);

  const selectModule = async (moduleCode: string) => {
    setSelectedCode(moduleCode);
    setMessage(null);
    setSelectedModule(null);
    try {
      const result = await AdminApi.contentModule(moduleCode);
      setSelectedModule((result.data || null) as PageModule | null);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '页面模块加载失败。', type: 'error' });
    }
  };

  useEffect(() => {
    let isMounted = true;
    AdminApi.contentModuleTree()
      .then((result) => {
        if (!isMounted) return;
        const rows = (result.data || []) as PageModuleGroup[];
        setTree(rows);
        const moduleCode = new URLSearchParams(window.location.search).get('module') || '';
        if (moduleCode) selectModule(moduleCode);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMessage({ text: err instanceof Error ? err.message : '页面内容管理初始化失败。', type: 'error' });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="content-admin-content">
      <aside className="content-module-sidebar" aria-label="官网一级目录和二级页面">
        <div className="content-sidebar-head">
          <p className="eyebrow">官网目录</p>
          <h2>页面目录</h2>
        </div>
        <div className="content-sidebar-tree">
          {tree.length ? tree.map((group, index) => (
            <details className="content-tree-group" open={index === 0} key={group.parent_code || index}>
              <summary>{group.parent_title || group.parent_code || '未分组'}</summary>
              <div className="content-tree-children">
                {(group.children || []).map((module) => (
                  <button
                    className={`content-module-button${selectedCode === module.module_code ? ' is-active' : ''}`}
                    type="button"
                    key={module.module_code || module.id}
                    onClick={() => module.module_code && selectModule(module.module_code)}
                  >
                    <span>{module.module_title || module.module_code}</span>
                    <small>{module.admin_enabled ? module.content_type : '正在开发中'}</small>
                  </button>
                ))}
              </div>
            </details>
          )) : '正在加载目录...'}
        </div>
      </aside>

      <section className="content-editor-panel" aria-live="polite">
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <div className="content-editor-root">
          <ContentModuleEditor module={selectedModule} />
        </div>
      </section>
    </main>
  );
}
