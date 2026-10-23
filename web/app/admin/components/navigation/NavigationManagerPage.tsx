'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';

type NavigationRow = { id: string; name: string; slug: string; parent?: { id?: string } | string | null; type: string; path: string; sort: number; visible: boolean; status: string; is_news_category: boolean; description: string };
const empty: NavigationRow = { id: '', name: '', slug: '', parent: null, type: 'list', path: '', sort: 0, visible: true, status: 'enabled', is_news_category: false, description: '' };
const parentId = (row: NavigationRow) => typeof row.parent === 'string' ? row.parent : row.parent?.id || '';
const navigationPath = (row: NavigationRow, rows: NavigationRow[]) => {
  const names = [row.name || row.slug || row.id];
  const visited = new Set([row.id]);
  let cursor: NavigationRow | undefined = row;
  while (cursor) {
    const id = parentId(cursor);
    if (!id || visited.has(id)) break;
    visited.add(id);
    cursor = rows.find((item) => item.id === id);
    if (cursor) names.unshift(cursor.name || cursor.slug || cursor.id);
  }
  return names.join(' / ');
};

export function NavigationManagerPage() {
  const [rows, setRows] = useState<NavigationRow[]>([]);
  const [form, setForm] = useState<NavigationRow>(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try { const result = await AdminApi.navigation() as { data?: NavigationRow[] }; setRows(result.data || []); }
    catch (e) { setError(e instanceof Error ? e.message : '导航数据加载失败'); }
  };
  useEffect(() => { void load(); }, []);
  const choices = useMemo(() => rows.filter((row) => row.id !== form.id), [rows, form.id]);
  const set = (key: keyof NavigationRow, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setBusy(true); setError('');
    try {
      const payload = { ...form, parent: parentId(form) || null };
      if (form.id) {
        let cursor = payload.parent;
        const visited = new Set<string>();
        while (cursor && !visited.has(cursor)) {
          if (cursor === form.id) throw new Error('不能将栏目移动到自身或自身的下级栏目中。');
          visited.add(cursor);
          const ancestor = rows.find((row) => row.id === cursor);
          cursor = ancestor ? parentId(ancestor) : '';
        }
      }
      if (form.id) await AdminApi.updateNavigationItem(form.id, payload);
      else await AdminApi.createNavigationItem(payload);
      setForm(empty); await load();
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
    finally { setBusy(false); }
  };
  const remove = async (row: NavigationRow) => {
    if (!window.confirm(`确认删除栏目“${row.name}”？仍被内容引用时系统会阻止删除。`)) return;
    try { await AdminApi.deleteNavigationItem(row.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : '删除失败'); }
  };
  const render = (parent = ''): ReactNode => rows.filter((row) => parentId(row) === parent).map((row) => (
    <div className="navigation-tree-node" key={row.id}>
      <article className="navigation-tree-row">
        <div className="navigation-tree-info">
          <strong>{row.name || row.slug}</strong>
          <span className="navigation-tree-path">{navigationPath(row, rows)}</span>
          <span className="navigation-tree-route">{row.path || '未设置访问路径'}</span>
        </div>
        <div className="navigation-tree-meta">
          <span className={`navigation-status${row.status === 'enabled' ? ' is-enabled' : ''}`}><i />{row.status === 'enabled' ? '启用' : '停用'}</span>
          <span className="navigation-type">{row.type}</span>
          {row.is_news_category ? <span className="navigation-type">新闻分类</span> : null}
        </div>
        <div className="navigation-tree-actions">
          <button className="text-button" type="button" onClick={() => setForm({ ...row, parent: parentId(row) })}>编辑</button>
          <button className="text-button is-danger" type="button" onClick={() => void remove(row)}>删除</button>
        </div>
      </article>
      {rows.some((item) => parentId(item) === row.id) ? <div className="navigation-tree-children">{render(row.id)}</div> : null}
    </div>
  ));

  return <section className="admin-page navigation-manager-page">
    <header className="admin-page-header">
      <div><p className="eyebrow">SITE STRUCTURE</p><h1>导航树管理</h1><p>栏目直接维护在现有 channels 表中；此处支持任意层级，删除仍被内容引用的栏目会被拒绝。</p></div>
      <div className="navigation-manager-count"><strong>{rows.length}</strong><span>个栏目</span></div>
    </header>
    {error ? <p className="inline-message error" role="alert">{error}</p> : null}
    <section className="editor-card navigation-editor-card">
      <div className="section-title-row">
        <div><p className="eyebrow">CONTENT SETTINGS</p><h2>{form.id ? '编辑栏目' : '新增栏目'}</h2></div>
        {form.id ? <span className="status-badge status-draft">正在编辑</span> : null}
      </div>
      <div className="editor-grid navigation-form-grid">
        <label>栏目名称<input value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label>标识 Slug<input value={form.slug} onChange={(event) => set('slug', event.target.value)} /></label>
        <label>父级栏目<select value={parentId(form)} onChange={(event) => set('parent', event.target.value)}><option value="">无（顶级）</option>{choices.map((row) => <option key={row.id} value={row.id}>{navigationPath(row, rows)}</option>)}</select></label>
        <label>栏目类型<select value={form.type} onChange={(event) => set('type', event.target.value)}>{['list', 'page', 'link', 'module', 'news', 'notice'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>访问路径<input value={form.path} onChange={(event) => set('path', event.target.value)} placeholder="例如 /news/company" /></label>
        <label>排序<input type="number" value={form.sort} onChange={(event) => set('sort', Number(event.target.value))} /></label>
        <label>状态<select value={form.status} onChange={(event) => { set('status', event.target.value); set('visible', event.target.value === 'enabled'); }}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
        <label className="navigation-checkbox-field"><input type="checkbox" checked={form.is_news_category} onChange={(event) => set('is_news_category', event.target.checked)} /><span>同时作为新闻分类</span></label>
        <label className="span-2">栏目说明<textarea rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
      </div>
      <div className="navigation-form-actions">
        <button className="primary-link-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? '正在保存…' : '保存栏目'}</button>
        {form.id ? <button className="secondary-button" type="button" disabled={busy} onClick={() => setForm(empty)}>取消编辑</button> : null}
      </div>
    </section>
    <section className="table-card navigation-tree-card">
      <div className="section-title-row"><div><p className="eyebrow">CURRENT STRUCTURE</p><h2>现有导航结构</h2></div><span className="navigation-tree-count">共 {rows.length} 项</span></div>
      {rows.length ? <div className="navigation-tree">{render()}</div> : <div className="navigation-empty"><span>☷</span><strong>暂无导航栏目</strong><small>新增栏目后，导航树会显示在这里。</small></div>}
    </section>
  </section>;
}
