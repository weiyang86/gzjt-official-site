'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AdminApi, type AdminTopic, type AdminTopicArticle, type AdminTopicCandidate } from '@/lib/admin/admin-api';

type TopicStatus = 'draft' | 'published' | 'archived';

type TopicForm = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  content: string;
  cover: string | null;
  status: TopicStatus;
  sort: number;
};

type MessageState = {
  text: string;
  type?: 'success' | 'error' | 'info';
};

const statusOptions: Array<{ value: TopicStatus; label: string }> = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 50 * 1024 * 1024;

const emptyForm = (): TopicForm => ({
  id: '',
  title: '',
  slug: '',
  subtitle: '',
  summary: '',
  content: '',
  cover: null,
  status: 'draft',
  sort: 0,
});

const statusText = (status?: string) => {
  if (status === 'published') return '已发布';
  if (status === 'archived') return '已归档';
  if (status === 'enabled') return '启用';
  if (status === 'disabled') return '停用';
  if (status === 'deleted') return '文章已删除';
  return status || '草稿';
};

const statusClass = (status?: string) => {
  if (status === 'published' || status === 'enabled') return 'status-published';
  if (status === 'archived' || status === 'disabled' || status === 'deleted') return 'status-archived';
  return 'status-draft';
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const truncateText = (value: string, max: number) => (
  value.length > max ? `${value.slice(0, max)}…` : value
);

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 50MB。';
  return '';
};

export function TopicManagerPage() {
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [form, setForm] = useState<TopicForm>(emptyForm);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState<MessageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [articles, setArticles] = useState<AdminTopicArticle[]>([]);
  const [candidates, setCandidates] = useState<AdminTopicCandidate[]>([]);
  const [articleBusy, setArticleBusy] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const articleRequestId = useRef(0);

  const selectedTopic = useMemo(
    () => topics.find((item) => item.id === selectedId) || null,
    [topics, selectedId],
  );

  const loadTopics = async () => {
    setLoading(true);
    try {
      const result = await AdminApi.topics();
      const rows = (result.data || []) as AdminTopic[];
      setTopics(rows);
      return rows;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '专题列表加载失败。', type: 'error' });
      return [] as AdminTopic[];
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async (topicId: string) => {
    const requestId = articleRequestId.current + 1;
    articleRequestId.current = requestId;
    if (!topicId) {
      setArticles([]);
      setCandidates([]);
      setArticleBusy(false);
      return;
    }
    setArticleBusy(true);
    try {
      const result = await AdminApi.topicArticles(topicId);
      if (articleRequestId.current !== requestId) return;
      const payload = result.data as { items?: AdminTopicArticle[]; candidates?: AdminTopicCandidate[] } | undefined;
      setArticles(payload?.items || []);
      setCandidates(payload?.candidates || []);
    } catch (err) {
      if (articleRequestId.current !== requestId) return;
      setMessage({ text: err instanceof Error ? err.message : '专题文章加载失败。', type: 'error' });
    } finally {
      if (articleRequestId.current === requestId) setArticleBusy(false);
    }
  };

  useEffect(() => {
    void loadTopics();
  }, []);

  const setField = <K extends keyof TopicForm>(key: K, value: TopicForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectTopic = (topic: AdminTopic) => {
    setForm({
      id: topic.id,
      title: topic.title || '',
      slug: topic.slug || '',
      subtitle: topic.subtitle || '',
      summary: topic.summary || '',
      content: topic.content || '',
      cover: topic.cover || null,
      status: (topic.status as TopicStatus) || 'draft',
      sort: Number(topic.sort) || 0,
    });
    setSelectedId(topic.id);
    setCandidateId('');
    setArticleSearch('');
    setMessage(null);
    void loadArticles(topic.id);
  };

  const newTopic = () => {
    articleRequestId.current += 1;
    setArticleBusy(false);
    const nextSort = topics.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0) + 1;
    setForm({ ...emptyForm(), sort: nextSort });
    setSelectedId('');
    setArticles([]);
    setCandidates([]);
    setCandidateId('');
    setArticleSearch('');
    setMessage(null);
  };

  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const error = validateImage(file);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const result = await AdminApi.uploadFile(formData);
      const uploaded = (result.data || {}) as { id?: string };
      if (!uploaded.id) throw new Error('上传成功但未返回文件 ID。');
      setField('cover', uploaded.id);
      setMessage({ text: '封面已上传，保存专题后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '封面上传失败。', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const saveTopic = async (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setMessage({ text: '请填写专题名称。', type: 'error' });
      return;
    }
    if (!form.id && !/^[a-z0-9][a-z0-9-]*$/.test(form.slug.trim())) {
      setMessage({ text: '请填写由小写英文、数字或中横线组成的 slug。', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const payload = {
      title,
      slug: form.slug.trim(),
      subtitle: form.subtitle.trim(),
      summary: form.summary.trim(),
      content: form.content,
      cover: form.cover || '',
      status: form.status,
      sort: Number(form.sort) || 0,
    };
    try {
      const result = form.id
        ? await AdminApi.updateTopic(form.id, payload)
        : await AdminApi.createTopic(payload);
      const saved = result.data as AdminTopic | undefined;
      setMessage({ text: '专题已保存。', type: 'success' });
      const rows = await loadTopics();
      if (saved?.id) {
        const fresh = rows.find((item) => item.id === saved.id) || saved;
        selectTopic(fresh);
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '专题保存失败。', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (topic: AdminTopic) => {
    const nextStatus: TopicStatus = topic.status === 'published' ? 'draft' : 'published';
    try {
      await AdminApi.updateTopic(topic.id, { status: nextStatus });
      setMessage({ text: `专题已${nextStatus === 'published' ? '发布' : '转为草稿'}。`, type: 'success' });
      await loadTopics();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '专题状态更新失败。', type: 'error' });
    }
  };

  const removeTopic = async (topic: AdminTopic) => {
    if (!window.confirm(`确认删除专题“${topic.title}”？专题下的文章关联会一并删除，文章本身不受影响。`)) return;
    try {
      await AdminApi.deleteTopic(topic.id);
      if (selectedId === topic.id) {
        articleRequestId.current += 1;
        setArticleBusy(false);
        setForm(emptyForm());
        setSelectedId('');
        setArticles([]);
        setCandidates([]);
      }
      setMessage({ text: '专题已删除。', type: 'success' });
      await loadTopics();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '专题删除失败。', type: 'error' });
    }
  };

  const moveTopic = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= topics.length) return;
    const next = [...topics];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    try {
      await Promise.all(next.map((item, rowIndex) => AdminApi.updateTopic(item.id, { sort: rowIndex + 1 })));
      setMessage({ text: '专题排序已更新。', type: 'success' });
      await loadTopics();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '专题排序调整失败。', type: 'error' });
    }
  };

  const addArticle = async () => {
    if (!selectedId) return;
    if (!candidateId) {
      setMessage({ text: '请先选择要加入专题的文章。', type: 'error' });
      return;
    }
    setArticleBusy(true);
    try {
      await AdminApi.addTopicArticle(selectedId, candidateId);
      setCandidateId('');
      setMessage({ text: '文章已加入专题。', type: 'success' });
      await Promise.all([loadArticles(selectedId), loadTopics()]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '文章加入专题失败。', type: 'error' });
    } finally {
      setArticleBusy(false);
    }
  };

  const moveArticle = async (index: number, direction: -1 | 1) => {
    if (!selectedId) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= articles.length) return;
    const next = [...articles];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setArticles(next);
    try {
      await AdminApi.reorderTopicArticles(selectedId, next.map((item) => item.id));
      setMessage({ text: '文章排序已更新。', type: 'success' });
      await loadArticles(selectedId);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '文章排序调整失败。', type: 'error' });
      await loadArticles(selectedId);
    }
  };

  const removeArticle = async (item: AdminTopicArticle) => {
    if (!selectedId) return;
    if (!window.confirm(`确认将“${item.title || '该文章'}”移出当前专题？文章本身不会被删除。`)) return;
    try {
      await AdminApi.deleteTopicArticle(selectedId, item.id);
      setMessage({ text: '文章已移出专题。', type: 'success' });
      await Promise.all([loadArticles(selectedId), loadTopics()]);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '移出文章失败。', type: 'error' });
    }
  };

  const filteredCandidates = useMemo(() => {
    const keyword = articleSearch.trim().toLowerCase();
    return candidates.filter((item) => (
      !keyword || `${item.title} ${item.status || ''}`.toLowerCase().includes(keyword)
    ));
  }, [candidates, articleSearch]);

  return (
    <main className="dashboard-content">
      <header style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <div>
          <p className="eyebrow">SPECIAL TOPICS</p>
          <h1>专题管理</h1>
          <p className="form-help-text">维护专题基本信息、封面和文章关联；前台只展示已发布专题及其中的已发布文章。</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="primary-link-button"
            type="button"
            onClick={newTopic}
            style={{ minHeight: 36, height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13 }}
          >
            新建专题
          </button>
          <a
            className="secondary-button"
            href="/topics"
            target="_blank"
            rel="noopener noreferrer"
            style={{ minHeight: 36, height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}
          >
            查看专题首页
          </a>
        </div>
      </header>

      {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}

      <form className="editor-card" onSubmit={saveTopic} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
        <div className="section-title-row">
          <div>
            <p className="eyebrow">page_contents · 专题</p>
            <h2>{form.id ? '编辑专题' : '新建专题'}</h2>
          </div>
          <span className={`status-badge ${statusClass(form.status)}`}>{statusText(form.status)}</span>
        </div>
        <div className="editor-grid">
          <label>专题名称
            <input type="text" required value={form.title} onChange={(event) => setField('title', event.target.value)} />
          </label>
          <label>Slug
            <input
              type="text"
              value={form.slug}
              disabled={Boolean(form.id)}
              placeholder="例如 1344-strategy"
              onChange={(event) => setField('slug', event.target.value)}
            />
          </label>
          <label>副标题
            <input type="text" value={form.subtitle} onChange={(event) => setField('subtitle', event.target.value)} />
          </label>
          <label>排序
            <input type="number" value={String(form.sort)} onChange={(event) => setField('sort', Number(event.target.value) || 0)} />
          </label>
          <label className="span-2">专题简介
            <textarea rows={3} value={form.summary} onChange={(event) => setField('summary', event.target.value)} />
          </label>
          <label className="span-2">专题说明
            <textarea rows={5} value={form.content} onChange={(event) => setField('content', event.target.value)} />
          </label>
          <div className="cover-field span-2">
            <label>专题封面</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB；未上传时前台使用默认图片。</p>
            <div className="cover-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={uploading} />
            </div>
            {form.cover ? (
              <div className="cover-preview-wrap">
                <img className="cover-preview" src={`/admin-api/assets/${encodeURIComponent(form.cover)}`} alt="专题封面预览" />
                <button className="secondary-button" type="button" onClick={() => setField('cover', null)}>移除封面</button>
              </div>
            ) : null}
          </div>
          <label>发布状态
            <select value={form.status} onChange={(event) => setField('status', event.target.value as TopicStatus)}>
              {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-link-button" type="submit" disabled={saving || uploading}>
            {saving ? '正在保存...' : '保存专题'}
          </button>
          {form.id ? <button className="secondary-button" type="button" onClick={newTopic}>取消编辑</button> : null}
        </div>
      </form>

      <section className="editor-card" style={{ minWidth: 0 }}>
        <div className="section-title-row">
          <div>
            <p className="eyebrow">专题列表</p>
            <h2>已创建专题（{topics.length}）</h2>
          </div>
        </div>
        <div className="table-wrap" style={{ maxWidth: '100%', minWidth: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>封面</th>
                <th>专题</th>
                <th>Slug</th>
                <th>状态</th>
                <th>排序</th>
                <th>文章数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>正在加载专题...</td></tr>
              ) : topics.length ? topics.map((topic, index) => (
                <tr key={topic.id}>
                  <td>
                    {topic.cover
                      ? <img className="cover-preview" style={{ width: 84, height: 52 }} src={`/admin-api/assets/${encodeURIComponent(topic.cover)}`} alt={topic.title} />
                      : <span className="form-help-text">未上传</span>}
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    <strong>{topic.title}</strong>
                    <div className="form-help-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={topic.summary || topic.subtitle || ''}>
                      {topic.summary || topic.subtitle || '未填写简介'}
                    </div>
                  </td>
                  <td>{topic.slug}</td>
                  <td><span className={`status-badge ${statusClass(topic.status)}`}>{statusText(topic.status)}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="text-button" type="button" onClick={() => moveTopic(index, -1)} disabled={index === 0}>上移</button>
                      <span>{Number(topic.sort || 0)}</span>
                      <button className="text-button" type="button" onClick={() => moveTopic(index, 1)} disabled={index === topics.length - 1}>下移</button>
                    </div>
                  </td>
                  <td>{Number(topic.article_count || 0)}</td>
                  <td>
                    <div className="table-actions">
                      {topic.status === 'published' ? (
                        <a className="text-button" href={`/topics/${encodeURIComponent(topic.slug)}`} target="_blank" rel="noopener noreferrer">查看</a>
                      ) : null}
                      <button className="text-button" type="button" onClick={() => selectTopic(topic)}>编辑</button>
                      <button className="text-button" type="button" onClick={() => togglePublish(topic)}>
                        {topic.status === 'published' ? '下架' : '发布'}
                      </button>
                      <button className="text-button" type="button" onClick={() => removeTopic(topic)}>删除</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}>暂无专题，请先新建一个专题。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId ? (
        <section className="editor-card" style={{ minWidth: 0 }}>
          <div className="section-title-row">
            <div>
              <p className="eyebrow">文章关联 · {selectedTopic?.slug || form.slug}</p>
              <h2>{selectedTopic?.title || form.title} 的文章</h2>
            </div>
            <span className={`status-badge ${statusClass(selectedTopic?.status)}`}>{statusText(selectedTopic?.status)}</span>
          </div>
          <p className="form-help-text">从下方选择文章加入专题；排序值越小越靠前。前台只展示已发布文章，草稿加入后暂不显示。</p>

          <div style={{ display: 'grid', gap: 12, marginBottom: 18, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', minWidth: 0 }}>
              <input
                type="search"
                placeholder="搜索文章标题"
                value={articleSearch}
                onChange={(event) => setArticleSearch(event.target.value)}
                style={{ minWidth: 0, width: '100%' }}
              />
              <button className="primary-link-button" type="button" onClick={addArticle} disabled={articleBusy || !candidateId}>
                {articleBusy ? '处理中...' : '加入专题'}
              </button>
            </div>
            <select
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
              style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}
            >
              <option value="">选择要加入的文章</option>
              {filteredCandidates.map((item) => (
                <option value={item.id} key={item.id} title={item.title}>
                  {truncateText(item.title || '未命名文章', 24)}（{statusText(item.status)}{item.publish_at ? ` · ${formatDate(item.publish_at)}` : ''}）
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrap" style={{ maxWidth: '100%', minWidth: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>排序</th>
                  <th>封面</th>
                  <th>文章标题</th>
                  <th>文章状态</th>
                  <th>发布时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {articleBusy ? (
                  <tr><td colSpan={6}>正在加载专题文章...</td></tr>
                ) : articles.length ? articles.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" type="button" onClick={() => moveArticle(index, -1)} disabled={index === 0}>上移</button>
                        <span>{index + 1}</span>
                        <button className="text-button" type="button" onClick={() => moveArticle(index, 1)} disabled={index === articles.length - 1}>下移</button>
                      </div>
                    </td>
                    <td>
                      {item.cover
                        ? <img className="cover-preview" style={{ width: 72, height: 44 }} src={`/admin-api/assets/${encodeURIComponent(item.cover)}`} alt={item.title} />
                        : <span className="form-help-text">无</span>}
                    </td>
                    <td style={{ maxWidth: 340 }}>
                      <span
                        title={item.title || ''}
                        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {item.title || '未命名文章'}
                      </span>
                    </td>
                    <td><span className={`status-badge ${statusClass(item.status)}`}>{statusText(item.status)}</span></td>
                    <td>{formatDate(item.publish_at) || '—'}</td>
                    <td>
                      <div className="table-actions">
                        {item.article_id ? <a className="text-button" href={`/admin/article-edit?id=${encodeURIComponent(item.article_id)}`}>编辑文章</a> : null}
                        <button className="text-button" type="button" onClick={() => removeArticle(item)}>移出专题</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}>该专题还没有关联文章，请从上方选择文章加入。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="editor-card" style={{ minWidth: 0 }}>
          <p className="eyebrow">文章关联</p>
          <h2>先选择一个专题</h2>
          <p className="form-help-text">点击上方专题列表中的“编辑”，即可维护该专题的文章关联和排序。</p>
        </section>
      )}
    </main>
  );
}
