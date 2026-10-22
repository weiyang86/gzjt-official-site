'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminApi, type HomeStat } from '@/lib/admin/admin-api';

type Tab = 'list' | 'editor';
type Filter = 'all' | 'visible' | 'hidden';
const empty: Omit<HomeStat, 'id'> = { label: '', value: '', unit: '', sort: 0, visible: true };
const pageSize = 6;

export function HomeStatsManagerPage() {
  const [rows, setRows] = useState<HomeStat[]>([]);
  const [form, setForm] = useState<HomeStat | Omit<HomeStat, 'id'>>(empty);
  const [tab, setTab] = useState<Tab>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEditing = 'id' in form && Boolean(form.id);
  const filteredRows = useMemo(() => rows.filter((row) => filter === 'all' || (filter === 'visible' ? row.visible : !row.visible)), [filter, rows]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const load = async () => {
    try {
      const result = await AdminApi.homeStats();
      setRows((result.data || []).map((row) => ({ ...row, id: String(row.id), visible: Boolean(row.visible), sort: Number(row.sort) || 0 })));
    } catch (e) {
      setError(e instanceof Error ? e.message : '经营指标加载失败');
    }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const set = (key: keyof typeof empty, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const beginCreate = () => { setForm({ ...empty, sort: rows.length ? Math.max(...rows.map((row) => row.sort)) + 1 : 1 }); setTab('editor'); setError(''); };
  const edit = (row: HomeStat) => { setForm({ ...row }); setTab('editor'); setError(''); };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { id, ...payload } = form as HomeStat;
    try {
      if (id) await AdminApi.updateHomeStat(id, payload);
      else await AdminApi.createHomeStat(payload);
      setForm(empty);
      setTab('list');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row: HomeStat) => {
    if (!window.confirm(`确认删除指标“${row.label}”？`)) return;
    setError('');
    try { await AdminApi.deleteHomeStat(row.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : '删除失败'); }
  };
  const toggle = async (row: HomeStat) => {
    setError('');
    try { await AdminApi.updateHomeStat(row.id, { label: row.label, value: row.value, unit: row.unit || '', sort: row.sort, visible: !row.visible }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : '状态更新失败'); }
  };

  return <main className="dashboard-content home-stats-page">
    <header className="home-stats-heading"><div><p className="eyebrow">HOMEPAGE BUSINESS METRICS</p><h2>经营指标看板</h2><p>手动录入并维护首页展示的经营数据，启用的指标会按排序显示在官网首页。</p></div><div className="home-stats-total"><strong>{rows.length}</strong><span>指标总数</span></div></header>
    {error && <p className="home-stats-message" role="alert">{error}</p>}
    <section className="home-stats-panel">
      <div className="home-stats-tabs" role="tablist" aria-label="经营指标管理">
        <button type="button" role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? 'is-active' : ''} onClick={() => setTab('list')}>指标列表 <span>{rows.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'editor'} className={tab === 'editor' ? 'is-active' : ''} onClick={beginCreate}>{isEditing ? '编辑指标' : '新增指标'}</button>
      </div>
      {tab === 'editor' ? <form className="home-stats-editor" onSubmit={save}>
        <div className="home-stats-editor-heading"><div><p className="eyebrow">{isEditing ? 'EDIT METRIC' : 'NEW METRIC'}</p><h3>{isEditing ? '编辑经营指标' : '新增经营指标'}</h3></div><button className="text-button" type="button" onClick={() => { setTab('list'); setError(''); }}>返回指标列表</button></div>
        <div className="home-stats-fields"><label>指标名称<input maxLength={64} required value={form.label} onChange={(event) => set('label', event.target.value)} placeholder="例如：资产总额" /></label><label>指标数值<input maxLength={64} required value={form.value} onChange={(event) => set('value', event.target.value)} placeholder="例如：128.6" /></label><label>单位<input maxLength={16} value={form.unit || ''} onChange={(event) => set('unit', event.target.value)} placeholder="例如：亿元、个" /></label><label>展示排序<input type="number" value={form.sort} onChange={(event) => set('sort', Number(event.target.value))} /></label></div>
        <label className="home-stats-switch"><input type="checkbox" checked={form.visible} onChange={(event) => set('visible', event.target.checked)} /><span><strong>在首页展示</strong><small>关闭后保留数据，仅从首页隐藏。</small></span></label>
        <div className="home-stats-actions"><button className="primary-link-button" type="submit" disabled={busy}>{busy ? '保存中…' : '保存指标'}</button><button className="secondary-button" type="button" onClick={() => { setForm(empty); setTab('list'); }}>取消</button></div>
      </form> : <div className="home-stats-list">
        <div className="home-stats-list-toolbar"><div className="home-stats-filters" role="tablist" aria-label="指标状态筛选">{([['all', '全部'], ['visible', '首页展示'], ['hidden', '已隐藏']] as const).map(([key, label]) => <button key={key} className={filter === key ? 'is-active' : ''} type="button" role="tab" aria-selected={filter === key} onClick={() => { setFilter(key); setPage(1); }}>{label}<span>{key === 'all' ? rows.length : key === 'visible' ? rows.filter((row) => row.visible).length : rows.filter((row) => !row.visible).length}</span></button>)}</div><button className="primary-link-button home-stats-add" type="button" onClick={beginCreate}>＋ 新增指标</button></div>
        {currentRows.length ? <div className="home-stats-table-wrap"><table className="home-stats-table"><thead><tr><th>排序</th><th>指标名称</th><th>首页数值</th><th>展示状态</th><th>操作</th></tr></thead><tbody>{currentRows.map((row) => <tr key={row.id}><td><span className="home-stats-order">{row.sort}</span></td><td><strong>{row.label}</strong></td><td><strong className="home-stats-value">{row.value}</strong><span className="home-stats-unit">{row.unit}</span></td><td><span className={`home-stats-status ${row.visible ? 'is-visible' : 'is-hidden'}`}><i />{row.visible ? '首页展示' : '已隐藏'}</span></td><td><div className="home-stats-row-actions"><button type="button" className="text-button" onClick={() => edit(row)}>编辑</button><button type="button" className="text-button" onClick={() => void toggle(row)}>{row.visible ? '隐藏' : '展示'}</button><button type="button" className="text-button is-danger" onClick={() => void remove(row)}>删除</button></div></td></tr>)}</tbody></table></div> : <div className="home-stats-empty"><strong>{rows.length ? '此状态下暂无指标' : '尚未添加经营指标'}</strong><span>{rows.length ? '切换上方筛选查看其他指标。' : '先添加已核实的经营数据，再开启首页展示。'}</span>{!rows.length && <button className="text-button" type="button" onClick={beginCreate}>新增第一项指标　→</button>}</div>}
        {filteredRows.length > pageSize && <div className="home-stats-pagination"><span>第 {page} / {pageCount} 页</span><div>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} className={page === number ? 'is-active' : ''} aria-label={`第 ${number} 页`} aria-current={page === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}</div></div>}
      </div>}
    </section>
    <p className="home-stats-footnote">指标数据由管理员人工维护，请在保存前核实数值和统计口径。</p>
  </main>;
}
