'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { AdminScope, Channel } from '../lists/types';

type ArticleStatus = 'draft' | 'published' | 'archived';
type MessageState = {
  text: string;
  type?: 'success' | 'error' | 'info';
};

type ArticleEditorRow = {
  id?: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  main_channel?: Channel | string | null;
  status?: ArticleStatus | string;
  source?: string;
  author?: string;
  publish_at?: string;
  content?: string;
  cover?: string | { id?: string } | null;
};

type UploadPayload = {
  id?: string;
  filename?: string;
  preview_url?: string;
  asset_url?: string;
};

type EditorApi = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  destroy?: () => void;
};

type WangEditorGlobal = {
  i18nChangeLanguage?: (language: string) => void;
  createEditor: (options: unknown) => EditorApi;
  createToolbar: (options: unknown) => { destroy?: () => void };
};

declare global {
  interface Window {
    wangEditor?: WangEditorGlobal;
  }
}

let wangEditorLoadPromise: Promise<void> | null = null;

const wangEditorCssHref = 'https://cdn.jsdelivr.net/npm/@wangeditor/editor@latest/dist/css/style.css';
const wangEditorScriptSrc = 'https://cdn.jsdelivr.net/npm/@wangeditor/editor@latest/dist/index.min.js';
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxUploadBytes = 10 * 1024 * 1024;

const getCoverId = (cover: ArticleEditorRow['cover']) => {
  if (!cover) return '';
  if (typeof cover === 'object') return cover.id || '';
  return cover;
};

const toLocalDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const fromLocalDateTime = (value: string) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const ensureWangEditor = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is not available'));
  if (window.wangEditor) return Promise.resolve();
  if (wangEditorLoadPromise) return wangEditorLoadPromise;

  wangEditorLoadPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${wangEditorCssHref}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = wangEditorCssHref;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${wangEditorScriptSrc}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('wangEditor script failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = wangEditorScriptSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('wangEditor script failed to load'));
    document.body.appendChild(script);
  });

  return wangEditorLoadPromise;
};

const validateImageFile = (file?: File | null, label = '图片') => {
  if (!file) return `请选择${label}。`;
  if (!allowedImageTypes.includes(file.type)) return `${label}仅支持 JPG、PNG、WEBP。`;
  if (file.size > maxUploadBytes) return `${label}不能超过 10MB。`;
  return '';
};

const normalizeStatus = (value?: string): ArticleStatus => {
  if (value === 'published' || value === 'archived') return value;
  return 'draft';
};

const emptyArticle = (): ArticleEditorRow => ({
  title: '',
  subtitle: '',
  summary: '',
  main_channel: '',
  status: 'draft',
  source: '',
  author: '',
  publish_at: '',
  content: '',
  cover: '',
});

export function ArticleEditorPage({ scope }: { scope: AdminScope }) {
  const isNotice = scope === 'notice';
  const [articleId, setArticleId] = useState('');
  const [form, setForm] = useState<ArticleEditorRow>(() => emptyArticle());
  const [channels, setChannels] = useState<Channel[]>([]);
  const [coverPreview, setCoverPreview] = useState('');
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorFallback, setEditorFallback] = useState(false);
  const editorRef = useRef<EditorApi | null>(null);
  const toolbarRef = useRef<{ destroy?: () => void } | null>(null);
  const contentRef = useRef('');
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const copy = useMemo(() => ({
    eyebrow: isNotice ? 'Notice Editor' : 'Article Editor',
    createTitle: isNotice ? '新增公示公告' : '新增新闻',
    editTitle: isNotice ? '编辑公示公告' : '编辑新闻',
    listHref: isNotice ? '/admin/notice-articles' : '/admin/articles',
    categoryHref: isNotice ? '/admin/notice-categories' : '/admin/categories',
    saveText: isNotice ? '公示公告已保存。' : '新闻已保存。',
    publishText: isNotice ? '公示公告已发布。' : '新闻已发布。',
    archiveText: isNotice ? '公示公告已归档。' : '新闻已归档。',
    coverHelp: isNotice ? '上传成功后会写入公示公告 cover 字段，文件保存在 Directus File Library。' : '上传成功后会写入文章 cover 字段，文件保存在 Directus File Library。',
    coverAlt: isNotice ? '公示公告封面预览' : '新闻封面预览',
  }), [isNotice]);

  const setField = (field: keyof ArticleEditorRow, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setEditorContent = (value: string) => {
    contentRef.current = value || '';
    setForm((prev) => ({ ...prev, content: value || '' }));
    if (editorRef.current) {
      editorRef.current.setHtml(value || '<p><br></p>');
    }
  };

  const getEditorContent = () => {
    if (editorRef.current) {
      const html = editorRef.current.getHtml();
      contentRef.current = html;
      return html;
    }
    return contentRef.current || form.content || '';
  };

  const uploadEditorImage = async (file: File, insertFn: (url: string, alt?: string, href?: string) => void) => {
    const error = validateImageFile(file, '正文图片');
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    try {
      setMessage({ text: '正文图片上传中...', type: 'info' });
      const formData = new FormData();
      formData.append('file', file);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as UploadPayload;
      if (!uploaded.id) throw new Error('上传成功但未返回文件信息。');
      const imageUrl = uploaded.preview_url || uploaded.asset_url || `/admin-api/assets/${encodeURIComponent(uploaded.id)}`;
      insertFn(imageUrl, uploaded.filename || file.name, imageUrl);
      setMessage({ text: '正文图片上传成功。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '正文图片上传失败，请稍后重试。', type: 'error' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    ensureWangEditor()
      .then(() => {
        if (!isMounted || !window.wangEditor || editorRef.current) return;
        const E = window.wangEditor;
        E.i18nChangeLanguage?.('zh-CN');
        editorRef.current = E.createEditor({
          selector: '#wang-editor',
          html: contentRef.current || '<p><br></p>',
          config: {
            placeholder: '请输入正文内容',
            MENU_CONF: {
              uploadImage: {
                customUpload: uploadEditorImage,
              },
            },
            onChange(editor: EditorApi) {
              const html = editor.getHtml();
              contentRef.current = html;
              setForm((prev) => ({ ...prev, content: html }));
            },
          },
          mode: 'default',
        });
        toolbarRef.current = E.createToolbar({
          editor: editorRef.current,
          selector: '#wang-toolbar',
          mode: 'default',
        });
        setEditorReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setEditorFallback(true);
        setMessage({ text: '富文本编辑器加载失败，已切换为基础文本模式。', type: 'error' });
      });

    return () => {
      isMounted = false;
      toolbarRef.current?.destroy?.();
      editorRef.current?.destroy?.();
      toolbarRef.current = null;
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams(window.location.search);
    const nextArticleId = params.get('id') || '';
    setArticleId(nextArticleId);

    const loadInitialData = async () => {
      setIsLoading(true);
      setMessage(null);
      try {
        const channelResult = await AdminApi.channels({ scope });
        const channelRows = (channelResult.data || []) as Channel[];
        if (!isMounted) return;
        setChannels(channelRows);

        if (nextArticleId) {
          const articleResult = await AdminApi.article(nextArticleId, { scope });
          const article = (articleResult.data || null) as ArticleEditorRow | null;
          if (!isMounted || !article) return;
          const channelId = typeof article.main_channel === 'object' && article.main_channel
            ? article.main_channel.id
            : typeof article.main_channel === 'string'
              ? article.main_channel
              : '';
          const inactiveChannel = typeof article.main_channel === 'object' && article.main_channel?.id
            && !channelRows.some((item) => String(item.id) === String(article.main_channel && typeof article.main_channel === 'object' ? article.main_channel.id : ''))
            ? article.main_channel
            : null;
          if (inactiveChannel) setChannels([...channelRows, { ...inactiveChannel, name: `${inactiveChannel.name || '已停用分类'}（已停用）` }]);

          const coverId = getCoverId(article.cover);
          setForm({
            ...emptyArticle(),
            ...article,
            main_channel: channelId,
            status: article.status || 'draft',
            publish_at: toLocalDateTime(article.publish_at),
            cover: coverId,
            content: article.content || '',
          });
          contentRef.current = article.content || '';
          setCoverPreview(coverId ? `/admin-api/assets/${encodeURIComponent(coverId)}` : '');
          if (editorRef.current) editorRef.current.setHtml(article.content || '<p><br></p>');
        }
      } catch (err) {
        if (!isMounted) return;
        setMessage({ text: err instanceof Error ? err.message : '页面初始化失败。', type: 'error' });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [scope]);

  const setCover = (fileId: string, previewUrl = '') => {
    setForm((prev) => ({ ...prev, cover: fileId }));
    setCoverPreview(fileId ? previewUrl || `/admin-api/assets/${encodeURIComponent(fileId)}` : '');
  };

  const uploadCover = async () => {
    const file = coverInputRef.current?.files?.[0];
    const error = validateImageFile(file, '封面图');
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
      setCover(uploaded.id, uploaded.preview_url);
      setMessage({ text: '封面图上传成功。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '封面图上传失败，请稍后重试。', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const buildPayload = (statusOverride: ArticleStatus) => ({
    title: String(form.title || '').trim(),
    subtitle: String(form.subtitle || '').trim(),
    summary: String(form.summary || '').trim(),
    main_channel: typeof form.main_channel === 'string' ? form.main_channel : '',
    status: normalizeStatus(statusOverride),
    source: String(form.source || '').trim(),
    author: String(form.author || '').trim(),
    publish_at: fromLocalDateTime(String(form.publish_at || '')),
    content: getEditorContent(),
    cover: getCoverId(form.cover),
  });

  const validatePayload = (payload: ReturnType<typeof buildPayload>) => {
    if (!payload.title) return '请输入标题。';
    if (!payload.main_channel) return '请选择栏目。';
    if (!payload.content.trim()) return '请输入正文。';
    return '';
  };

  const saveArticle = async (nextStatus: ArticleStatus) => {
    const payload = buildPayload(nextStatus);
    const error = validatePayload(payload);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }

    setIsBusy(true);
    try {
      const result = articleId
        ? await AdminApi.updateArticle(articleId, payload, { scope })
        : await AdminApi.createArticle(payload, { scope });
      const saved = (result.data || {}) as { id?: string };
      const savedId = saved.id || articleId;
      if (!articleId && savedId) {
        setArticleId(savedId);
        window.history.replaceState(null, '', `${isNotice ? '/admin/notice-edit' : '/admin/article-edit'}?id=${encodeURIComponent(savedId)}`);
      }
      const text = nextStatus === 'published' ? copy.publishText : nextStatus === 'archived' ? copy.archiveText : copy.saveText;
      setMessage({ text, type: 'success' });
      window.setTimeout(() => {
        window.location.href = copy.listHref;
      }, 500);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存失败，请稍后重试。', type: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <main className="dashboard-content">
      <form className="editor-card" onSubmit={handleSubmit}>
        <div className="form-actions top-actions">
          <a className="secondary-button" href={copy.listHref}>返回列表</a>
          <a className="secondary-button" href={copy.categoryHref}>分类管理</a>
          <button className="secondary-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle(normalizeStatus(String(form.status || 'draft')))}>保存</button>
          <button className="secondary-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle('draft')}>保存草稿</button>
          <button className="secondary-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle('archived')}>归档</button>
          <button className="primary-link-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle('published')}>发布</button>
        </div>

        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}

        <div className="section-title-row">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{articleId ? copy.editTitle : copy.createTitle}</h2>
          </div>
          <span className={`status-badge status-${form.status || 'draft'}`}>
            {form.status === 'published' ? '已发布' : form.status === 'archived' ? '已归档' : '草稿'}
          </span>
        </div>

        <div className="editor-grid">
          <label className="span-2">标题 <span className="required">*</span>
            <input type="text" maxLength={255} required value={form.title || ''} onChange={(event) => setField('title', event.target.value)} />
          </label>
          <label className="span-2">副标题
            <input type="text" maxLength={255} value={form.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} />
          </label>
          <label className="span-2">摘要
            <textarea rows={3} maxLength={500} value={form.summary || ''} onChange={(event) => setField('summary', event.target.value)} />
          </label>
          <label>栏目 <span className="required">*</span>
            <select required value={typeof form.main_channel === 'string' ? form.main_channel : ''} onChange={(event) => setField('main_channel', event.target.value)}>
              <option value="">{isLoading ? '正在加载栏目...' : '请选择栏目'}</option>
              {channels.map((channel) => (
                <option value={channel.id} key={channel.id}>{channel.name || channel.slug || channel.id}</option>
              ))}
            </select>
          </label>
          <label>当前状态
            <select value={String(form.status || 'draft')} onChange={(event) => setField('status', event.target.value)}>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </label>
          <label>来源
            <input type="text" maxLength={128} value={form.source || ''} onChange={(event) => setField('source', event.target.value)} />
          </label>
          <label>作者
            <input type="text" maxLength={128} value={form.author || ''} onChange={(event) => setField('author', event.target.value)} />
          </label>
          <label>发布时间
            <input type="datetime-local" value={form.publish_at || ''} onChange={(event) => setField('publish_at', event.target.value)} />
          </label>

          <div className="cover-field span-2">
            <label htmlFor="cover-file">封面图（JPG / PNG / WEBP，10MB以内）</label>
            <div className="cover-upload-row">
              <input id="cover-file" ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" />
              <button className="secondary-button" type="button" disabled={isUploading} onClick={uploadCover}>{isUploading ? '正在上传...' : '上传封面'}</button>
            </div>
            <p className="field-help">{copy.coverHelp}</p>
            {coverPreview ? (
              <div className="cover-preview-wrap">
                <img className="cover-preview" src={coverPreview} alt={copy.coverAlt} />
                <button className="text-button" type="button" onClick={() => {
                  if (coverInputRef.current) coverInputRef.current.value = '';
                  setCover('');
                }}>移除封面</button>
              </div>
            ) : null}
          </div>

          <div className="span-2">
            <label htmlFor="wang-editor">正文 <span className="required">*</span></label>
            <div id="wang-toolbar" className="wang-toolbar" />
            <div id="wang-editor" className="wang-editor" aria-label="正文富文本编辑器" />
            <textarea
              className="content-editor"
              rows={16}
              required
              hidden={!editorFallback}
              value={form.content || ''}
              onChange={(event) => {
                contentRef.current = event.target.value;
                setField('content', event.target.value);
              }}
            />
          </div>
        </div>

        <div className="form-actions">
          <a className="secondary-button" href={copy.listHref}>返回列表</a>
          <button className="secondary-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle(normalizeStatus(String(form.status || 'draft')))}>保存</button>
          <button className="secondary-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle('draft')}>保存草稿</button>
          <button className="secondary-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle('archived')}>归档</button>
          <button className="primary-link-button" type="button" disabled={isBusy || isLoading} onClick={() => saveArticle('published')}>发布</button>
        </div>
      </form>
    </main>
  );
}
