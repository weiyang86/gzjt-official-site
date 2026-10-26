'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AdminApi, type AdminManagedLink } from '@/lib/admin/admin-api';
import type { MessageState } from './types';

type LinkManagerKind = 'quick' | 'friend';

type LinkForm = {
  id: string;
  title: string;
  url: string;
  position: string;
  sort: number;
  status: string;
};

const kindConfig: Record<LinkManagerKind, { title: string; intro: string; emptyText: string }> = {
  quick: {
    title: '快捷入口',
    intro: '维护官网页脚的快捷入口链接。前台读取已启用记录，按排序值从小到大展示。',
    emptyText: '暂无快捷入口，点击上方新增链接开始配置。',
  },
  friend: {
    title: '友情链接',
    intro: '维护官网页脚的友情链接。仅允许 http/https 外链或站内路径，停用后前台立即隐藏。',
    emptyText: '暂无友情链接，点击上方新增链接开始配置。',
  },
};

const emptyForm = (sort = 0): LinkForm => ({
  id: '',
  title: '',
  url: '',
  position: 'footer',
  sort,
  status: 'enabled',
});

const validate = (form: LinkForm) => {
  if (!form.title.trim()) return '请填写链接名称。';
  if (form.title.trim().length > 50) return '链接名称不能超过 50 个字符。';
  if (!form.url.trim()) return '请填写链接地址。';
  if (!/^(https?:\/\/|\/)/i.test(form.url.trim())) return '链接地址只允许 http/https 或站内路径。';
  return '';
};

export function ManagedLinkManager({ kind }: { kind: LinkManagerKind }) {
  const config = kindConfig[kind];
  const [items, setItems] = useState<AdminManagedLink[]>([]);
  const [form, setForm] = useState<LinkForm>(() => emptyForm());
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = kind === 'quick' ? await AdminApi.quickLinks() : await AdminApi.friendLinks();
      const rows = (result.data || []) as AdminManagedLink[];
      setItems(rows);
      return rows;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : `${config.title}加载失败。`, type: 'error' });
      setItems([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const resetForm = () => {
    const nextSort = items.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0) + 1;
    setForm(emptyForm(nextSort));
    setMessage(null);
  };

  const selectItem = (item: AdminManagedLink) => {
    setForm({
      id: item.id,
      title: item.title,
      url: item.url,
      position: item.position || 'footer',
      sort: Number(item.sort) || 0,
      status: item.status || 'enabled',
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validate(form);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      position: form.position.trim() || 'footer',
      sort: Number(form.sort) || 0,
      status: form.status || 'enabled',
    };
    try {
      if (form.id) {
        if (kind === 'quick') await AdminApi.updateQuickLink(form.id, payload);
        else await AdminApi.updateFriendLink(form.id, payload);
        setMessage({ text: '链接已更新。', type: 'success' });
      } else {
        if (kind === 'quick') await AdminApi.createQuickLink(payload);
        else await AdminApi.createFriendLink(payload);
        setMessage({ text: '链接已新增。', type: 'success' });
      }
      const rows = await loadItems();
      const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
      setForm(emptyForm(maxSort + 1));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存链接失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: AdminManagedLink) => {
    const nextStatus = item.status === 'enabled' ? 'disabled' : 'enabled';
    const label = nextStatus === 'enabled' ? '启用' : '停用';
    if (!window.confirm(`确认${label}“${item.title}”？`)) return;
    try {
      const payload = {
        title: item.title,
        url: item.url,
        position: item.position || 'footer',
        sort: Number(item.sort) || 0,
        status: nextStatus,
      };
      if (kind === 'quick') await AdminApi.updateQuickLink(item.id, payload);
      else await AdminApi.updateFriendLink(item.id, payload);
      setMessage({ text: `链接已${label}。`, type: 'success' });
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '状态更新失败。', type: 'error' });
    }
  };

  const removeItem = async (item: AdminManagedLink) => {
    if (!window.confirm(`确认删除“${item.title}”？删除后不可恢复。`)) return;
    try {
      if (kind === 'quick') await AdminApi.deleteQuickLink(item.id);
      else await AdminApi.deleteFriendLink(item.id);
      setMessage({ text: '链接已删除。', type: 'success' });
      if (form.id === item.id) setForm(emptyForm());
      await loadItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '删除失败。', type: 'error' });
    }
  };

  return (
    <main className="dashboard-content" aria-label={config.title}>
      {message && <div className={`inline-message ${message.type}`}>{message.text}</div>}

      <section className="notice-card">
        <p className="eyebrow">站点链接 · {kind === 'quick' ? 'quick_links' : 'friend_links'}</p>
        <h2>{config.title}</h2>
        <p>{config.intro}</p>
      </section>

      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{form.id ? '编辑链接' : '新增链接'}</p>
            <h2>{form.id ? form.title : `新增${config.title}`}</h2>
          </div>
          {form.id && <button className="secondary-button" type="button" onClick={resetForm}>取消编辑</button>}
        </div>
        <form onSubmit={handleSubmit} className="editor-grid">
          <label>
            链接名称
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={50} required />
          </label>
          <label>
            链接地址
            <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https:// 或 / 开头的站内路径" required />
          </label>
          <label>
            展示位置
            <input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="footer" />
          </label>
          <label>
            排序
            <input type="number" value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) || 0 })} />
          </label>
          <label>
            状态
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
            </select>
          </label>
          <div className="form-actions span-2">
            <button className="primary-link-button" type="submit" disabled={isSaving}>{isSaving ? '正在保存...' : '保存链接'}</button>
          </div>
        </form>
      </section>

      <section className="table-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">当前配置</p>
            <h2>{config.title}列表</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadItems}>刷新</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>地址</th>
                <th>位置</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6}>正在加载...</td></tr>}
              {!isLoading && items.length === 0 && <tr><td colSpan={6}>{config.emptyText}</td></tr>}
              {!isLoading && items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td className="muted-text">{item.url}</td>
                  <td>{item.position || '-'}</td>
                  <td>{Number(item.sort) || 0}</td>
                  <td>{item.status === 'enabled' ? '启用' : '停用'}</td>
                  <td>
                    <button className="text-button" type="button" onClick={() => selectItem(item)}>编辑</button>
                    <button className="text-button" type="button" onClick={() => toggleStatus(item)}>
                      {item.status === 'enabled' ? '停用' : '启用'}
                    </button>
                    <button className="text-button" type="button" onClick={() => removeItem(item)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
