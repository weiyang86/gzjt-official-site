'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import { sanitizeRichTextHtml } from '@/lib/richtext/sanitize';
import { CmsRichTextEditor, type CmsRichTextEditorHandle } from './CmsRichTextEditor';
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
  attachments?: Array<{
    title?: string;
    file?: string | { id?: string; filename_download?: string } | null;
    directus_files_id?: string | { id?: string; filename_download?: string } | null;
    file_id?: string | null;
  }>;
};

type UploadPayload = {
  id?: string;
  filename?: string;
  preview_url?: string;
  asset_url?: string;
};

type AttachmentItem = {
  id: string;
  title: string;
  file: string;
  filename: string;
  url: string;
};

type EditorApi = CmsRichTextEditorHandle;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedAttachmentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const allowedAttachmentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const maxUploadBytes = 50 * 1024 * 1024;

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

const validateImageFile = (file?: File | null, label = '图片') => {
  if (!file) return `请选择${label}。`;
  if (!allowedImageTypes.includes(file.type)) return `${label}仅支持 JPG、PNG、WEBP。`;
  if (file.size > maxUploadBytes) return `${label}不能超过 50MB。`;
  return '';
};

const normalizeStatus = (value?: string): ArticleStatus => {
  if (value === 'published' || value === 'archived') return value;
  return 'draft';
};

const normalizeAttachmentEntries = (value: ArticleEditorRow['attachments']): AttachmentItem[] => {
  if (!Array.isArray(value)) return [];
  const items = value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const rawFile = entry.file ?? entry.directus_files_id ?? entry.file_id;
      const file = typeof rawFile === 'string'
        ? rawFile
        : rawFile && typeof rawFile === 'object' && rawFile.id
          ? rawFile.id
          : '';
      if (!file) return null;
      const filename = rawFile && typeof rawFile === 'object' ? rawFile.filename_download || '' : '';
      return {
        id: `${file}-${index}`,
        title: entry.title || filename || `附件${index + 1}`,
        file,
        filename,
        url: `/admin-api/assets/${encodeURIComponent(file)}`,
      };
    });
  return items.filter((item): item is AttachmentItem => item !== null);
};

const validateAttachmentFile = (file?: File | null) => {
  if (!file) return '请选择附件文件。';
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  if (!allowedAttachmentTypes.includes(file.type) && !allowedAttachmentExtensions.includes(extension)) {
    return '附件仅支持 PDF、Word、Excel 文件。';
  }
  if (file.size > maxUploadBytes) return '附件不能超过 50MB。';
  return '';
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
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [editorFallback, setEditorFallback] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [draggingAttachmentId, setDraggingAttachmentId] = useState('');
  const [dragOverAttachmentId, setDragOverAttachmentId] = useState('');
  const editorRef = useRef<EditorApi | null>(null);
  const contentRef = useRef('');
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const contentAttachmentInputRef = useRef<HTMLInputElement | null>(null);

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
    attachmentHelp: isNotice ? '支持上传 PDF、Word、Excel 作为公告附件，前台详情页可下载查看。' : '支持上传 PDF、Word、Excel 作为新闻附件，前台详情页可下载查看。',
  }), [isNotice]);

  const setField = (field: keyof ArticleEditorRow, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getEditorContent = () => {
    if (editorRef.current) {
      const html = editorRef.current.getHtml();
      contentRef.current = html;
      return html;
    }
    return contentRef.current || form.content || '';
  };

  const uploadInlineImageToUrl = async (file: File) => {
    const error = validateImageFile(file, '正文图片');
    if (error) throw new Error(error);
    const formData = new FormData();
    formData.append('file', file);
    const result = await AdminApi.uploadFile(formData);
    const uploaded = (result.data || {}) as UploadPayload;
    if (!uploaded.id) throw new Error('上传成功但未返回文件信息。');
    return {
      id: uploaded.id,
      filename: uploaded.filename || file.name,
      url: uploaded.preview_url || uploaded.asset_url || `/admin-api/assets/${encodeURIComponent(uploaded.id)}`,
    };
  };

  const insertHtmlIntoEditor = (html: string) => {
    const editor = editorRef.current as unknown as { insertHtml?: (value: string) => void };
    if (editor?.insertHtml) {
      editor.insertHtml(html);
      return;
    }
    const current = getEditorContent();
    const nextHtml = `${current || '<p><br></p>'}${html}`;
    setEditorHtml(nextHtml);
  };

  useEffect(() => () => {
    editorRef.current = null;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams(window.location.search);
    const nextArticleId = params.get('id') || '';
    setArticleId(nextArticleId);

    const loadInitialData = async () => {
      setIsLoading(true);
      setMessage(null);
      updateAttachments([]);
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
            attachments: article.attachments || [],
          });
          contentRef.current = article.content || '';
          setCoverPreview(coverId ? `/admin-api/assets/${encodeURIComponent(coverId)}` : '');
          updateAttachments(normalizeAttachmentEntries(article.attachments));
          if (editorRef.current) editorRef.current.setHtml(article.content || '<p></p>');
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

  const updateAttachments = (next: AttachmentItem[]) => {
    setAttachments(next);
    setForm((prev) => ({
      ...prev,
      attachments: next.map((item) => ({ title: item.title, file: item.file })),
    }));
  };

  const setEditorHtml = (html: string) => {
    contentRef.current = html;
    setForm((prev) => ({ ...prev, content: html }));
    if (editorRef.current) editorRef.current.setHtml(html);
  };

  const buildAttachmentLinkHtml = (item: AttachmentItem) => {
    const href = item.url || '';
    if (!href) return '';
    const title = (item.title || item.filename || '附件').replace(/"/g, '&quot;');
    const filename = (item.filename || item.title || 'attachment').replace(/"/g, '&quot;');
    return `<p><a href="${href}" target="_blank" rel="noopener noreferrer" download="${filename}">附件下载：${title}</a></p>`;
  };

  const insertAttachmentLinksIntoContent = (items: AttachmentItem[]) => {
    if (!items.length) return;
    const currentHtml = getEditorContent();
    const attachmentHtml = items.map(buildAttachmentLinkHtml).filter(Boolean).join('');
    if (!attachmentHtml) return;
    const nextHtml = `${currentHtml || '<p><br></p>'}${attachmentHtml}`;
    setEditorHtml(nextHtml);
  };

  const removeAttachmentLinksFromContent = (item: AttachmentItem) => {
    const currentHtml = getEditorContent();
    if (!currentHtml || typeof window === 'undefined') return;
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a')).filter((anchor) => anchor.getAttribute('href') === item.url);
    if (!anchors.length) return;
    anchors.forEach((anchor) => {
      const parent = anchor.parentElement;
      const parentText = parent?.textContent?.trim() || '';
      if (parent?.tagName === 'P' && parentText === anchor.textContent?.trim()) {
        parent.remove();
      } else {
        anchor.remove();
      }
    });
    setEditorHtml(doc.body.innerHTML || '<p><br></p>');
  };

  const reorderAttachments = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = attachments.findIndex((item) => item.id === sourceId);
    const targetIndex = attachments.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...attachments];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateAttachments(next);
  };

  const removeAttachment = (id: string) => {
    const current = attachments.find((item) => item.id === id);
    if (!current) return;
    removeAttachmentLinksFromContent(current);
    updateAttachments(attachments.filter((item) => item.id !== id));
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

  const uploadAttachments = async (
    files: File[],
    options: { insertIntoContent?: boolean; resetInput?: () => void } = {},
  ): Promise<AttachmentItem[]> => {
    if (!files.length) {
      setMessage({ text: '请选择附件文件。', type: 'error' });
      return [];
    }
    const validationError = files.map((file) => validateAttachmentFile(file)).find(Boolean);
    if (validationError) {
      setMessage({ text: validationError, type: 'error' });
      return [];
    }
    setIsUploadingAttachment(true);
    try {
      const uploadedItems: AttachmentItem[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const result = await AdminApi.uploadFile(formData);
        const uploaded = (result.data || {}) as UploadPayload;
        if (!uploaded.id) throw new Error('上传成功但未返回附件文件 ID。');
        uploadedItems.push({
          id: `${uploaded.id}-${Date.now()}-${uploadedItems.length}`,
          title: uploaded.filename || file.name,
          file: uploaded.id,
          filename: uploaded.filename || file.name,
          url: uploaded.preview_url || uploaded.asset_url || `/admin-api/assets/${encodeURIComponent(uploaded.id)}`,
        });
      }
      const nextList = [...attachments, ...uploadedItems];
      updateAttachments(nextList);
      if (options.insertIntoContent) insertAttachmentLinksIntoContent(uploadedItems);
      setMessage({ text: files.length > 1 ? `已上传 ${files.length} 个附件。` : '附件上传成功。', type: 'success' });
      options.resetInput?.();
      return uploadedItems;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '附件上传失败，请稍后重试。', type: 'error' });
      return [];
    } finally {
      setIsUploadingAttachment(false);
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
    content: sanitizeRichTextHtml(getEditorContent()).html,
    cover: getCoverId(form.cover),
    attachments: attachments.map((item) => ({ title: item.title.trim() || item.filename || '附件', file: item.file })),
  });

  const validatePayload = (payload: ReturnType<typeof buildPayload>) => {
    if (!payload.title) return '请输入标题。';
    if (!payload.main_channel) return '请选择栏目。';
    if (!payload.content.trim()) return '请输入正文。';
    if (/<img[^>]+src=["']data:image\//i.test(payload.content)) {
      return '正文包含未上传的粘贴图片（base64）。请使用“图片上传”或“上传附件并插入正文”功能重新插入图片后再保存。';
    }
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

  const handleSubmit = (event: { preventDefault: () => void }) => {
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
            <label htmlFor="cover-file">封面图（JPG / PNG / WEBP，50MB以内）</label>
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

          <div className="cover-field span-2">
            <label htmlFor="attachment-file">附件上传（PDF / Word / Excel，50MB以内）</label>
            <div className="cover-upload-row">
              <input
                id="attachment-file"
                ref={attachmentInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />
              <button
                className="secondary-button"
                type="button"
                disabled={isUploadingAttachment}
                onClick={() => uploadAttachments(Array.from(attachmentInputRef.current?.files || []), {
                  resetInput: () => {
                    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
                  },
                })}
              >
                {isUploadingAttachment ? '正在上传...' : '上传附件'}
              </button>
            </div>
            <p className="field-help">{copy.attachmentHelp} 支持一次选择多个文件，附件列表支持拖动排序。</p>
            {attachments.length ? (
              <div className="attachment-list">
                {attachments.map((item, index) => (
                  <div
                    className={`attachment-item ${dragOverAttachmentId === item.id ? 'is-drag-over' : ''}`.trim()}
                    key={item.id}
                    draggable
                    onDragStart={() => {
                      setDraggingAttachmentId(item.id);
                      setDragOverAttachmentId(item.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dragOverAttachmentId !== item.id) setDragOverAttachmentId(item.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      reorderAttachments(draggingAttachmentId, item.id);
                      setDraggingAttachmentId('');
                      setDragOverAttachmentId('');
                    }}
                    onDragEnd={() => {
                      setDraggingAttachmentId('');
                      setDragOverAttachmentId('');
                    }}
                  >
                    <div className="attachment-drag-handle" aria-hidden="true" title="拖动排序">::</div>
                    <div className="attachment-meta">
                      <input
                        type="text"
                        value={item.title}
                        maxLength={120}
                        onChange={(event) => {
                          const next = attachments.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry);
                          updateAttachments(next);
                        }}
                        placeholder="附件标题"
                      />
                      <span className="attachment-name">{item.filename || item.title}</span>
                    </div>
                    <div className="table-actions">
                      <a className="text-link" href={item.url || `/admin-api/assets/${encodeURIComponent(item.file)}`} target="_blank" rel="noreferrer">预览</a>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="span-2">
            <label>正文 <span className="required">*</span></label>
            <div className="content-editor-tools">
              <input
                ref={contentAttachmentInputRef}
                className="content-editor-file"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />
              <button
                className="secondary-button"
                type="button"
                disabled={isUploadingAttachment}
                onClick={() => uploadAttachments(Array.from(contentAttachmentInputRef.current?.files || []), {
                  insertIntoContent: true,
                  resetInput: () => {
                    if (contentAttachmentInputRef.current) contentAttachmentInputRef.current.value = '';
                  },
                })}
              >
                {isUploadingAttachment ? '正在上传附件...' : '上传附件并插入正文'}
              </button>
            </div>
            <p className="field-help">在正文区域可一次上传多个 PDF、Word、Excel，系统会按当前顺序批量插入可下载链接；上方附件列表支持删除和拖动排序。</p>
            {!editorFallback ? (
              <CmsRichTextEditor
                value={form.content || ''}
                minHeight={520}
                uploadImage={async (file) => {
                  setMessage({ text: '正文图片上传中...', type: 'info' });
                  const uploaded = await uploadInlineImageToUrl(file);
                  setMessage({ text: '正文图片上传成功。', type: 'success' });
                  return { url: uploaded.url, filename: uploaded.filename };
                }}
                onReady={(handle) => {
                  editorRef.current = handle;
                  const current = contentRef.current || form.content || '';
                  if (current && !handle.getHtml()) handle.setHtml(current);
                }}
                onChange={(html) => {
                  contentRef.current = html;
                  setField('content', html);
                }}
                onError={(errorText) => {
                  setEditorFallback(true);
                  setMessage({ text: errorText, type: 'error' });
                }}
              />
            ) : null}
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
