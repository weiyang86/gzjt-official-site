'use client';

import { useEffect, useState } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';

type QuickLink = { id: string; title: string; slug: string; url: string; position: string; summary: string; icon: string | null; sort: number; status: string };
const empty: QuickLink = { id: '', title: '', slug: '', url: '', position: 'home', summary: '', icon: null, sort: 0, status: 'enabled' };

export function QuickLinksManagerPage() {
  const [rows, setRows] = useState<QuickLink[]>([]);
  const [form, setForm] = useState<QuickLink>(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const result = await AdminApi.quickLinks({ position: 'home' }) as { data?: QuickLink[] }; setRows(result.data || []); } catch (e) { setError(e instanceof Error ? e.message : '快捷入口加载失败'); } };
  useEffect(() => { void load(); }, []);
  const set = (key: keyof QuickLink, value: string | number | null) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => { setBusy(true); setError(''); try { if (form.id) await AdminApi.updateQuickLink(form.id, form); else await AdminApi.createQuickLink(form); setForm(empty); await load(); } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); } finally { setBusy(false); } };
  const remove = async (row: QuickLink) => { if (!window.confirm(`确认删除快捷入口“${row.title}”？`)) return; try { await AdminApi.deleteQuickLink(row.id); await load(); } catch (e) { setError(e instanceof Error ? e.message : '删除失败'); } };
  const check = async (row: QuickLink) => { if (!/^https?:\/\//i.test(row.url)) { setError('站内地址无法从浏览器跨页面检查，请直接打开验证。'); return; } try { const response = await fetch(row.url, { method: 'HEAD', mode: 'no-cors' }); setError(response.type === 'opaque' ? `已发起检查：${row.url}（跨域站点无法读取状态码）` : `${row.url} 返回 ${response.status}`); } catch { setError(`链接检查失败：${row.url}`); } };
  return <section className="admin-page quick-links-page"><header className="admin-page-header"><div><p className="eyebrow">HOME QUICK LINKS</p><h1>快捷入口配置</h1><p>维护首页快捷入口的名称、图标、跳转地址、排序和启停状态。</p></div><div className="quick-links-summary"><span className="quick-links-summary-value">{rows.length}</span><span>首页入口</span></div></header>
    {error && <p className="quick-links-message" role="alert">{error}</p>}
    <div className="admin-card quick-links-card"><div className="quick-links-card-header"><div><p className="eyebrow">CONTENT SETTINGS</p><h2>{form.id ? '编辑快捷入口' : '新增快捷入口'}</h2></div>{form.id && <span className="quick-links-editing">正在编辑</span>}</div><div className="quick-links-form-grid">
      <label>入口名称<input value={form.title} onChange={(e) => set('title', e.target.value)} /></label><label>标识 Slug<input value={form.slug} onChange={(e) => set('slug', e.target.value)} /></label><label>跳转地址<input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="/news 或 https://example.com" /></label><label>图标地址<input value={form.icon || ''} onChange={(e) => set('icon', e.target.value || null)} placeholder="Directus 文件 ID 或图片地址" /></label><label>排序<input type="number" value={form.sort} onChange={(e) => set('sort', Number(e.target.value))} /></label><label>状态<select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></label>
    </div><label className="quick-links-summary-field">说明<textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} /></label><div className="quick-links-form-actions"><button className="primary-link-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? '保存中…' : '保存入口'}</button>{form.id && <button className="secondary-button" type="button" onClick={() => setForm(empty)}>取消编辑</button>}</div></div>
    <div className="admin-card quick-links-card"><div className="quick-links-card-header"><div><p className="eyebrow">HOMEPAGE DISPLAY</p><h2>首页快捷入口</h2></div><span className="quick-links-count">共 {rows.length} 项</span></div>{rows.length ? <div className="quick-links-table-wrap"><table className="quick-links-table"><thead><tr><th>排序</th><th>入口</th><th>跳转地址</th><th>图标</th><th>状态</th><th>操作</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><span className="quick-links-sort">{row.sort}</span></td><td><strong>{row.title}</strong>{row.summary && <small>{row.summary}</small>}</td><td><span className="quick-links-url" title={row.url}>{row.url}</span></td><td>{row.icon ? <span className="quick-links-icon-set">已设置</span> : <span className="quick-links-muted">未设置</span>}</td><td><span className={`quick-links-status ${row.status === 'enabled' ? 'is-enabled' : 'is-disabled'}`}><i />{row.status === 'enabled' ? '启用' : '停用'}</span></td><td><div className="quick-links-actions"><button className="text-button" type="button" onClick={() => setForm(row)}>编辑</button><button className="text-button" type="button" onClick={() => void check(row)}>检查链接</button><button className="text-button is-danger" type="button" onClick={() => void remove(row)}>删除</button></div></td></tr>)}</tbody></table></div> : <div className="quick-links-empty"><span>＋</span><p>还没有首页快捷入口</p><small>在上方填写内容后保存，入口会显示在这里。</small></div>}</div>
  </section>;
}
