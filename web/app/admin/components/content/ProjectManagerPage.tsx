'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { AdminApi, type AdminProject } from '@/lib/admin/admin-api';
import { CmsRichTextEditor, type CmsRichTextEditorHandle } from '../editor/CmsRichTextEditor';

type MessageState = { text: string; type: 'success' | 'error' | 'info' } | null;

type ProjectForm = {
  id: string;
  name: string;
  type: string;
  location: string;
  summary: string;
  progress: string;
  image: string;
  detail: string;
  map_x: string;
  map_y: string;
  sort: number;
  status: string;
};

const projectTypes = ['交通工程', '房建工程', '文旅开发', '产业投资'];
const statusOptions = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
];
const fallbackProjectImage = '/img/雅砻江大桥.jpg';
const statChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(13,47,90,.08)',
  color: '#0d4f89',
  fontSize: 13,
};
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageBytes = 50 * 1024 * 1024;

const emptyForm = (sort = 0): ProjectForm => ({
  id: '',
  name: '',
  type: '交通工程',
  location: '',
  summary: '',
  progress: '',
  image: '',
  detail: '',
  map_x: '',
  map_y: '',
  sort,
  status: 'enabled',
});

const toForm = (project: AdminProject): ProjectForm => ({
  id: project.id,
  name: project.name || '',
  type: project.type || '',
  location: project.location || '',
  summary: project.summary || '',
  progress: project.progress || '',
  image: project.image || '',
  detail: project.detail || '',
  map_x: project.map_x === null || project.map_x === undefined ? '' : String(project.map_x),
  map_y: project.map_y === null || project.map_y === undefined ? '' : String(project.map_y),
  sort: Number(project.sort) || 0,
  status: project.status || 'enabled',
});

const buildPayload = (project: AdminProject, sort = Number(project.sort) || 0) => ({
  name: project.name || '',
  type: project.type || '',
  location: project.location || '',
  summary: project.summary || '',
  progress: project.progress || '',
  image: project.image || null,
  detail: project.detail || '',
  map_x: project.map_x ?? '',
  map_y: project.map_y ?? '',
  sort,
  status: project.status || 'enabled',
});

const imageSrc = (value?: string) => {
  if (!value) return fallbackProjectImage;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return value.startsWith('/') ? value : `/admin-api/assets/${encodeURIComponent(value)}`;
};

const statusText = (status?: string) => status === 'enabled' ? '启用' : '停用';

const coordinateOf = (value?: number | null) => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const hasCoordinate = (project: AdminProject) => coordinateOf(project.map_x) !== null && coordinateOf(project.map_y) !== null;

const validateImage = (file?: File | null) => {
  if (!file) return '请选择图片文件。';
  if (!allowedImageTypes.includes(file.type)) return '仅支持 JPG、PNG、WEBP 图片。';
  if (file.size > maxImageBytes) return '图片大小不能超过 50MB。';
  return '';
};

export function ProjectManagerPage() {
  const [items, setItems] = useState<AdminProject[]>([]);
  const [form, setForm] = useState<ProjectForm>(() => emptyForm());
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState<MessageState>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const detailEditorRef = useRef<CmsRichTextEditorHandle | null>(null);

  // 切换项目或清空表单时把外部详情写入编辑器，避免沿用上一个项目的正文。
  useEffect(() => {
    const editor = detailEditorRef.current;
    if (!editor) return;
    if (editor.getHtml() === form.detail) return;
    editor.setHtml(form.detail || '');
  }, [form.detail]);

  const loadProjects = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await AdminApi.projects();
      const rows = (result.data || []) as AdminProject[];
      setItems(rows);
      return rows;
    } catch (err) {
      const text = err instanceof Error ? err.message : '项目列表加载失败。';
      setLoadError(text);
      setMessage({ text, type: 'error' });
      setItems([]);
      return [] as AdminProject[];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const nextSort = useMemo(
    () => items.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0) + 1,
    [items],
  );

  const visibleItems = useMemo(
    () => statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter),
    [items, statusFilter],
  );

  const mappedItems = useMemo(() => items.filter(hasCoordinate), [items]);
  const unmappedItems = useMemo(() => items.filter((item) => !hasCoordinate(item)), [items]);
  const enabledCount = useMemo(() => items.filter((item) => item.status === 'enabled').length, [items]);
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const key = item.type?.trim() || '未填写类型';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  }, [items]);
  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const key = item.location?.trim() || '未填写位置';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  }, [items]);

  const setField = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm(nextSort));
    setMessage(null);
  };

  const selectProject = (project: AdminProject) => {
    setForm(toForm(project));
    setMessage(null);
    document.getElementById('project-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const applyMapCoordinate = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    setForm((current) => ({ ...current, map_x: x.toFixed(1), map_y: y.toFixed(1) }));
    setMessage({ text: '地图坐标已填入表单，保存后生效。', type: 'info' });
  };

  const locateOnMap = (project: AdminProject) => {
    setForm(toForm(project));
    setMessage({ text: '已载入项目，请在上方地图上点击位置设置坐标。', type: 'info' });
    document.getElementById('project-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      setMessage({ text: '项目图片已上传，保存后生效。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '图片上传失败。', type: 'error' });
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

  const validateForm = () => {
    if (!form.name.trim()) return '请输入项目名称。';
    if ((form.map_x === '') !== (form.map_y === '')) return '地图横向坐标和纵向坐标需要同时填写，或同时留空。';
    const coordinates = [form.map_x, form.map_y];
    for (const value of coordinates) {
      if (value === '') continue;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0 || number > 100) return '地图坐标必须是 0 到 100 之间的数值。';
    }
    return '';
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    // 编辑器 onChange 有节流，保存时以编辑器实时内容为准，避免丢掉刚输入的内容。
    const detail = detailEditorRef.current ? detailEditorRef.current.getHtml() : form.detail;
    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      location: form.location.trim(),
      summary: form.summary.trim(),
      progress: form.progress.trim(),
      image: form.image || null,
      detail,
      map_x: form.map_x,
      map_y: form.map_y,
      sort: form.id ? Number(form.sort || 0) : (Number(form.sort || 0) || nextSort),
      status: form.status || 'enabled',
    };
    try {
      if (form.id) {
        await AdminApi.updateProject(form.id, payload);
        setMessage({ text: '项目信息已更新。', type: 'success' });
        await loadProjects();
      } else {
        await AdminApi.createProject(payload);
        setMessage({ text: '项目已新增。', type: 'success' });
        const rows = await loadProjects();
        const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
        setForm(emptyForm(maxSort + 1));
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存项目失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (project: AdminProject) => {
    const enable = project.status !== 'enabled';
    if (!window.confirm(`确认${enable ? '启用' : '停用'}“${project.name}”？停用后前台列表、地图和详情都不再展示。`)) return;
    try {
      await AdminApi.updateProject(project.id, { ...buildPayload(project), status: enable ? 'enabled' : 'disabled' });
      if (form.id === project.id) setForm((current) => ({ ...current, status: enable ? 'enabled' : 'disabled' }));
      setMessage({ text: `项目已${enable ? '启用' : '停用'}。`, type: 'success' });
      await loadProjects();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '项目状态更新失败。', type: 'error' });
    }
  };

  const moveProject = async (project: AdminProject, direction: -1 | 1) => {
    const index = visibleItems.findIndex((item) => item.id === project.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= visibleItems.length) return;
    const target = visibleItems[targetIndex];
    const currentSort = Number(project.sort) || 0;
    const targetSort = Number(target.sort) || 0;
    try {
      if (currentSort !== targetSort) {
        // 只交换相邻两条记录的排序值，避免整表重写；部分失败时下方会重新加载真实数据。
        await Promise.all([
          AdminApi.updateProject(project.id, buildPayload(project, targetSort)),
          AdminApi.updateProject(target.id, buildPayload(target, currentSort)),
        ]);
        setForm((current) => {
          if (current.id === project.id) return { ...current, sort: targetSort };
          if (current.id === target.id) return { ...current, sort: currentSort };
          return current;
        });
      } else {
        const next = [...items];
        const from = next.findIndex((item) => item.id === project.id);
        const to = next.findIndex((item) => item.id === target.id);
        if (from < 0 || to < 0) return;
        [next[from], next[to]] = [next[to], next[from]];
        await Promise.all(next.map((item, rowIndex) => AdminApi.updateProject(item.id, buildPayload(item, rowIndex + 1))));
      }
      setMessage({ text: '排序已更新。', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '排序调整失败。', type: 'error' });
    } finally {
      await loadProjects();
    }
  };

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <div className="section-title-row">
          <div><p className="eyebrow">重点项目</p><h2>项目管理</h2></div>
        </div>
        <p>项目保存到 <code>page_content_items</code>，模块编码固定为 <code>project-list</code>，内容类型固定为 <code>project</code>；前台列表、地图和详情只展示已启用项目。</p>
        <p>当前已维护 {items.length} 个项目，其中启用 {enabledCount} 个、停用 {items.length - enabledCount} 个，已设置地图坐标 {mappedItems.length} 个。</p>
      </section>

      <section className="editor-card" id="project-map">
        <div className="section-title-row">
          <div><p className="eyebrow">项目地图预览</p><h2>项目分布</h2></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="status-badge status-published">{mappedItems.length} / {items.length} 个已定位</span>
            <button className="primary-link-button" type="button" onClick={() => {
              resetForm();
              document.getElementById('project-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}>新增项目</button>
            <button className="secondary-button" type="button" onClick={() => document.getElementById('project-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>查看项目列表</button>
          </div>
        </div>
        <p className="form-help-text">地图读取项目列表数据：红点为已启用项目，灰点为已停用项目；点击点位载入编辑，点击地图空白处可为当前表单项目设置坐标（新增项目也可直接选点）。</p>
        {loadError ? <div className="inline-message error">{loadError}</div> : null}
        <div
          onClick={applyMapCoordinate}
          style={{
            position: 'relative',
            maxWidth: 1000,
            margin: '0 auto',
            aspectRatio: '1672 / 941',
            background: 'rgba(13,47,90,.04)',
            borderRadius: 16,
            overflow: 'hidden',
            cursor: 'crosshair',
          }}
        >
          <img
            src="/img/map.png?v=20261025"
            alt="甘孜州项目分布地图"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
          {mappedItems.map((project) => {
            const x = coordinateOf(project.map_x);
            const y = coordinateOf(project.map_y);
            if (x === null || y === null) return null;
            const active = form.id === project.id;
            return (
              <button
                key={project.id}
                type="button"
                title={`${project.name}${project.location ? ` · ${project.location}` : ''}（点击编辑）`}
                aria-label={`编辑项目：${project.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  selectProject(project);
                }}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: active ? 18 : 14,
                  height: active ? 18 : 14,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  background: project.status === 'enabled' ? '#ff3b3b' : '#94a3b8',
                  boxShadow: active ? '0 0 0 6px rgba(13,79,137,.28)' : '0 0 0 4px rgba(255,59,59,.16)',
                  cursor: 'pointer',
                  padding: 0,
                  zIndex: active ? 3 : 2,
                }}
              />
            );
          })}
          {form.map_x !== '' && form.map_y !== '' && Number.isFinite(Number(form.map_x)) && Number.isFinite(Number(form.map_y)) ? (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${Math.min(100, Math.max(0, Number(form.map_x)))}%`,
                top: `${Math.min(100, Math.max(0, Number(form.map_y)))}%`,
                width: 10,
                height: 10,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: '#0d4f89',
                border: '2px solid #fff',
                boxShadow: '0 0 0 3px rgba(13,79,137,.25)',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />
          ) : null}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          <span style={statChipStyle}>已定位 <b>{mappedItems.length}</b></span>
          <span style={statChipStyle}>未定位 <b>{unmappedItems.length}</b></span>
          {typeCounts.map(([type, count]) => <span style={statChipStyle} key={`type-${type}`}>类型·{type} <b>{count}</b></span>)}
          {locationCounts.map(([location, count]) => <span style={statChipStyle} key={`location-${location}`}>位置·{location} <b>{count}</b></span>)}
        </div>
        {unmappedItems.length ? (
          <p className="form-help-text" style={{ marginTop: 10 }}>
            未设置坐标：{unmappedItems.map((item) => item.name).join('、')}
          </p>
        ) : null}
        {items.length ? null : <p className="form-help-text" style={{ marginTop: 10 }}>暂无项目数据，请先在下方新增项目。</p>}
      </section>

      <section className="editor-card" id="project-editor">
        <div className="section-title-row">
          <div><p className="eyebrow">新增 / 编辑</p><h2>{form.id ? '编辑项目' : '新增项目'}</h2></div>
          <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
        </div>
        {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
        <form className="editor-grid" onSubmit={handleSave}>
          <label>项目名称 <span className="required">*</span>
            <input type="text" required maxLength={100} value={form.name} onChange={(event) => setField('name', event.target.value)} />
          </label>
          <label>项目类型
            <input type="text" list="project-type-options" maxLength={50} value={form.type} onChange={(event) => setField('type', event.target.value)} />
            <datalist id="project-type-options">
              {projectTypes.map((type) => <option value={type} key={type} />)}
            </datalist>
          </label>
          <label>项目位置
            <input type="text" maxLength={100} placeholder="例如：康定市" value={form.location} onChange={(event) => setField('location', event.target.value)} />
          </label>
          <label>建设进度
            <input type="text" maxLength={50} placeholder="例如：在建 / 已完工" value={form.progress} onChange={(event) => setField('progress', event.target.value)} />
          </label>
          <label>排序
            <input type="number" value={String(form.sort)} onChange={(event) => setField('sort', Number(event.target.value || 0))} />
          </label>
          <label>状态
            <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
              {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>地图横向坐标
            <input type="number" min={0} max={100} step={0.1} placeholder="0-100，可空" value={form.map_x} onChange={(event) => setField('map_x', event.target.value)} />
          </label>
          <label>地图纵向坐标
            <input type="number" min={0} max={100} step={0.1} placeholder="0-100，可空" value={form.map_y} onChange={(event) => setField('map_y', event.target.value)} />
          </label>
          <p className="field-tip span-2" style={{ marginTop: -4 }}>可直接在上方“项目分布”地图上点击选点，坐标会自动填入；新增项目也可以先选点再保存。</p>
          <label className="span-2">项目简介
            <textarea rows={3} maxLength={500} value={form.summary} onChange={(event) => setField('summary', event.target.value)} />
          </label>
          <div className="cover-field span-2">
            <label>项目图片</label>
            <p className="field-tip">支持 JPG、PNG、WEBP，单个文件不超过 50MB；上传后保存生效。</p>
            <div className="cover-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={isUploading} />
            </div>
            {form.image ? (
              <div className="cover-preview-wrap">
                <img className="cover-preview" src={imageSrc(form.image)} alt="项目图片预览" />
                <button className="secondary-button" type="button" onClick={() => {
                  setField('image', '');
                  setMessage({ text: '项目图片已移除，保存后生效。', type: 'success' });
                }}>移除图片</button>
              </div>
            ) : null}
          </div>
          <div className="span-2">
            <p className="field-tip" style={{ marginBottom: 8 }}>项目详情</p>
            <CmsRichTextEditor
              value={form.detail}
              onChange={(html) => setField('detail', html)}
              onReady={(handle) => { detailEditorRef.current = handle; }}
              uploadImage={uploadDetailImage}
              minHeight={360}
              placeholder="请输入项目详情"
            />
          </div>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving || isUploading}>
              {isSaving ? '正在保存...' : form.id ? '保存修改' : '新增项目'}
            </button>
            {form.id ? <button className="secondary-button" type="button" onClick={resetForm}>取消编辑</button> : null}
          </div>
        </form>
      </section>

      <section className="editor-card" id="project-list">
        <div className="section-title-row">
          <div><p className="eyebrow">已维护项目</p><h2>项目列表</h2></div>
          <label>状态筛选
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">全部</option>
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
            </select>
          </label>
        </div>
        {isLoading ? <p className="form-help-text">正在加载...</p> : visibleItems.length ? (
          <div className="timeline-list">
            {visibleItems.map((project, visibleIndex) => (
                <article className="timeline-item-card" key={project.id}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <img
                      className="cover-preview"
                      style={{ width: 120, height: 76, objectFit: 'cover', flex: '0 0 auto' }}
                      src={imageSrc(project.image)}
                      alt=""
                    />
                    <div>
                      <h3>{project.name}</h3>
                      <p>{[project.type, project.location, project.progress].filter(Boolean).join(' · ') || '—'}</p>
                      <small>排序：{project.sort} · 状态：{statusText(project.status)} · 地图：{hasCoordinate(project) ? '已定位' : '未定位'}</small>
                    </div>
                  </div>
                  <div className="table-actions">
                    <button className="text-button" type="button" onClick={() => selectProject(project)}>编辑</button>
                    <button className="text-button" type="button" onClick={() => locateOnMap(project)}>{hasCoordinate(project) ? '调整点位' : '去定位'}</button>
                    <button className="text-button" type="button" disabled={visibleIndex <= 0} onClick={() => moveProject(project, -1)}>上移</button>
                    <button className="text-button" type="button" disabled={visibleIndex >= visibleItems.length - 1} onClick={() => moveProject(project, 1)}>下移</button>
                    <button className="text-button" type="button" onClick={() => toggleStatus(project)}>
                      {project.status === 'enabled' ? '停用' : '启用'}
                    </button>
                  </div>
                </article>
            ))}
          </div>
        ) : (
          <p className="form-help-text">{items.length ? '没有符合筛选条件的项目。' : '暂无项目记录，请先新增一条。'}</p>
        )}
      </section>
    </main>
  );
}
