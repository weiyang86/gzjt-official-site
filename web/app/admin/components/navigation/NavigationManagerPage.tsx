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
  const render = (parent = '', depth = 0): ReactNode => rows.filter((r) => parentId(r) === parent).map((row) => (
    <div key={row.id} style={{ marginLeft: depth * 20 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong style={{ flex: 1 }}>{row.name}<small style={{ marginLeft: 10, color: '#64748b' }}>{row.path} · {row.status === 'enabled' ? '启用' : '停用'}</small>{parentId(row) ? <small style={{ display: 'block', marginTop: 4, color: '#64748b', fontWeight: 400 }}>导航层级：{navigationPath(row, rows)}</small> : null}</strong>
        <button type="button" onClick={() => setForm({ ...row, parent: parentId(row) })}>编辑</button>
        <button type="button" onClick={() => void remove(row)}>删除</button>
      </div>
      {render(row.id, depth + 1)}
    </div>
  ));
  return <section className="admin-page">
    <header className="admin-page-header"><div><p className="eyebrow">SITE STRUCTURE</p><h1>导航树管理</h1><p>栏目直接维护在现有 channels 表中；此处支持任意层级，删除仍被引用的栏目会被拒绝。</p></div></header>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    <div className="admin-card" style={{ padding: 20, marginBottom: 20 }}>
      <h2>{form.id ? '编辑栏目' : '新增栏目'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <label>栏目名称<input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label>Slug<input value={form.slug} onChange={(e) => set('slug', e.target.value)} /></label>
        <label>父级栏目<select value={parentId(form)} onChange={(e) => set('parent', e.target.value)}><option value="">无（顶级）</option>{choices.map((r) => <option key={r.id} value={r.id}>{navigationPath(r, rows)}</option>)}</select></label>
        <label>类型<select value={form.type} onChange={(e) => set('type', e.target.value)}>{['list','page','link','module','news','notice'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label>访问路径<input value={form.path} onChange={(e) => set('path', e.target.value)} placeholder="例如 /news/company" /></label>
        <label>排序<input type="number" value={form.sort} onChange={(e) => set('sort', Number(e.target.value))} /></label>
        <label>状态<select value={form.status} onChange={(e) => { set('status', e.target.value); set('visible', e.target.value === 'enabled'); }}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
        <label><input type="checkbox" checked={form.is_news_category} onChange={(e) => set('is_news_category', e.target.checked)} /> 新闻分类</label>
      </div>
      <p><label>说明<textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></label></p>
      <button type="button" disabled={busy} onClick={() => void save()}>{busy ? '保存中…' : '保存栏目'}</button>{form.id && <button type="button" onClick={() => setForm(empty)}>取消编辑</button>}
    </div>
    <div className="admin-card" style={{ padding: 20 }}><h2>现有导航结构（{rows.length}）</h2>{render() || <p>暂无栏目</p>}</div>
  </section>;
}
