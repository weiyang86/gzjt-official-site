'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { AdminScope, CategoryRow, MessageState } from './types';

const emptyForm = (scope: AdminScope): CategoryRow => ({
  id: '',
  name: '',
  slug: '',
  parent: null,
  type: scope === 'notice' ? 'notice' : 'list',
  path: '',
  sort: 0,
  status: 'enabled',
  description: '',
});

type NavigationOption = { id: string; name?: string; slug?: string; parent?: string | { id?: string } | null };
const parentId = (value: CategoryRow['parent'] | NavigationOption['parent']) => typeof value === 'string' ? value : value?.id || '';
const navigationPath = (row: NavigationOption, rows: NavigationOption[]) => {
  const names = [row.name || row.slug || row.id];
  const visited = new Set([row.id]);
  let cursor: NavigationOption | undefined = row;
  while (cursor) {
    const id = parentId(cursor.parent);
    if (!id || visited.has(id)) break;
    visited.add(id);
    cursor = rows.find((item) => item.id === id);
    if (cursor) names.unshift(cursor.name || cursor.slug || cursor.id);
  }
  return names.join(' / ');
};

const validate = (form: CategoryRow, scope: AdminScope) => {
  if (!form.name?.trim()) return scope === 'notice' ? '请输入公示公告分类名称。' : '请输入分类名称。';
  if (!form.slug?.trim()) return '请输入分类标识 slug。';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(form.slug.trim())) return 'slug 只能使用小写字母、数字和中横线。';
  return '';
};

export function CategoryManagerPage({ scope }: { scope: AdminScope }) {
  const isNotice = scope === 'notice';
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [navigationItems, setNavigationItems] = useState<NavigationOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [usage, setUsage] = useState<Record<string, number | string>>({});
  const [form, setForm] = useState<CategoryRow>(() => emptyForm(scope));
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const copy = useMemo(() => ({
    title: isNotice ? '公示公告分类' : '新闻分类',
    eyebrow: isNotice ? 'Notice Categories' : 'Categories',
    heading: isNotice ? '公示公告分类管理' : '新闻分类管理',
    backHref: isNotice ? '/admin/notice-articles' : '/admin/articles',
    backLabel: isNotice ? '回到公示公告管理' : '回到新闻管理',
    empty: isNotice ? '暂无公示公告分类。' : '暂无分类。',
    countLabel: isNotice ? '公告数量' : '新闻数量',
    inUseMessage: (count: number) => isNotice
      ? `该分类已有 ${count} 条公示公告，不能删除。建议改为“停用”。`
      : `该分类已有 ${count} 篇新闻，不能删除。建议改为“停用”。`,
    disableConfirm: (count: number) => isNotice
      ? `该分类已有 ${count} 条公示公告，停用后不会删除数据，但新增/编辑公示公告时不再可选。确认停用？`
      : `该分类已有 ${count} 篇新闻，停用后不会删除新闻，但新增/编辑新闻时不再可选。确认停用？`,
  }), [isNotice]);

  const setField = (field: keyof CategoryRow, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'slug' && typeof value === 'string' && value.trim() && !prev.path?.trim()) {
        next.path = isNotice ? `/disclosure/${value.trim()}` : `/channels/${value.trim()}`;
      }
      return next;
    });
  };

  const loadNavigationItems = async () => {
    try {
      const result = await AdminApi.navigation() as { data?: NavigationOption[] };
      setNavigationItems(result.data || []);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '父级栏目加载失败。', type: 'error' });
      setNavigationItems([]);
    }
  };

  const parentChoices = useMemo(() => {
    if (!form.id) return navigationItems;
    const byId = new Map(navigationItems.map((item) => [item.id, item]));
    return navigationItems.filter((item) => {
      const visited = new Set<string>();
      let cursor: NavigationOption | undefined = item;
      while (cursor && !visited.has(cursor.id)) {
        if (cursor.id === form.id) return false;
        visited.add(cursor.id);
        cursor = byId.get(parentId(cursor.parent));
      }
      return true;
    });
  }, [navigationItems, form.id]);

  const resetForm = () => {
    setForm(emptyForm(scope));
    setMessage(null);
  };

  const loadUsage = async (categories: CategoryRow[]) => {
    const pairs = await Promise.all(categories.map(async (category) => {
      try {
        const result = await AdminApi.categoryUsage(category.id, { scope });
        const payload = result as { data?: { article_count?: number } };
        return [category.id, Number(payload.data?.article_count || 0)] as const;
      } catch {
        return [category.id, '后续支持'] as const;
      }
    }));
    setUsage(Object.fromEntries(pairs));
  };

  const loadCategories = async (nextPage = page) => {
    setIsLoading(true);
    try {
      const requestPage = (targetPage: number) => AdminApi.categories({ scope, keyword: keyword.trim(), status, ...(isNotice ? {} : { page: targetPage, limit: pageSize }) });
      let payload = await requestPage(nextPage) as { data?: CategoryRow[]; meta?: { filter_count?: number; total_count?: number } };
      let rows = payload.data || [];
      let nextTotal = Number(payload.meta?.filter_count ?? payload.meta?.total_count ?? rows.length);
      const effectivePage = isNotice ? 1 : Math.min(nextPage, Math.max(1, Math.ceil(nextTotal / pageSize)));
      if (!isNotice && effectivePage !== nextPage) {
        payload = await requestPage(effectivePage) as { data?: CategoryRow[]; meta?: { filter_count?: number; total_count?: number } };
        rows = payload.data || [];
        nextTotal = Number(payload.meta?.filter_count ?? payload.meta?.total_count ?? rows.length);
      }
      setItems(rows);
      setTotal(nextTotal);
      setPage(effectivePage);
      await loadUsage(rows);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '分类加载失败。', type: 'error' });
      setItems([]);
      setTotal(0);
      setUsage({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadNavigationItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    loadCategories(1);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const error = validate(form, scope);
    if (error) {
      setMessage({ text: error, type: 'error' });
      return;
    }
    const payload = {
      name: form.name?.trim(),
      slug: form.slug?.trim(),
      type: isNotice ? 'notice' : form.type || 'list',
      path: form.path?.trim(),
      parent: parentId(form.parent) || null,
      sort: Number(form.sort || 0),
      status: form.status || 'enabled',
      visible: form.status !== 'disabled',
      description: form.description?.trim() || '',
    };
    try {
      if (form.id) {
        await AdminApi.updateCategory(form.id, payload, { scope });
        setMessage({ text: '分类已更新。', type: 'success' });
      } else {
        await AdminApi.createCategory(payload, { scope });
        setMessage({ text: '分类已新增。', type: 'success' });
        setForm(emptyForm(scope));
      }
      await loadCategories(page);
      await loadNavigationItems();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存分类失败。', type: 'error' });
    }
  };

  const editCategory = async (id: string) => {
    try {
      const result = await AdminApi.category(id, { scope });
      const row = (result as { data?: CategoryRow }).data;
      if (row) {
        setForm({ ...emptyForm(scope), ...row, sort: Number(row.sort || 0), status: row.status || 'enabled' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '分类详情加载失败。', type: 'error' });
    }
  };

  const toggleCategory = async (row: CategoryRow) => {
    const enable = row.status !== 'enabled';
    const count = Number(usage[row.id] || 0);
    const prompt = !enable && count > 0 ? copy.disableConfirm(count) : `确认${enable ? '启用' : '停用'}该分类？`;
    if (!window.confirm(prompt)) return;
    try {
      await AdminApi.setCategoryEnabled(row.id, enable, { scope });
      setMessage({ text: `分类已${enable ? '启用' : '停用'}。`, type: 'success' });
      await loadCategories(page);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '分类操作失败。', type: 'error' });
    }
  };

  const deleteCategory = async (row: CategoryRow) => {
    const count = Number(usage[row.id] || 0);
    if (count > 0) {
      setMessage({ text: copy.inUseMessage(count), type: 'error' });
      return;
    }
    if (!window.confirm('确认删除该分类？此操作不可恢复。')) return;
    try {
      await AdminApi.deleteCategory(row.id, { scope });
      if (form.id === row.id) resetForm();
      setMessage({ text: '分类已删除。', type: 'success' });
      await loadCategories(!isNotice && items.length === 1 && page > 1 ? page - 1 : page);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分类操作失败。';
      if (msg.startsWith('Cannot delete category that has ')) {
        const parsedCount = Number(msg.match(/\d+/)?.[0] || 0);
        setMessage({ text: copy.inUseMessage(parsedCount), type: 'error' });
        return;
      }
      setMessage({ text: msg, type: 'error' });
    }
  };

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <div className="section-title-row">
          <div><p className="eyebrow">分类维护</p><h2>{copy.heading}</h2></div>
          <a className="secondary-button" href={copy.backHref}>{copy.backLabel}</a>
        </div>
        <p>停用分类会设置 <code>status=disabled</code> 和 <code>visible=false</code>，不会删除已有数据。</p>
      </section>

      <div className="split-grid">
        <section className="editor-card">
          <div className="section-title-row">
            <div><p className="eyebrow">新增 / 编辑</p><h2>{form.id ? '编辑分类' : '新增分类'}</h2></div>
            <button className="secondary-button" type="button" onClick={resetForm}>清空表单</button>
          </div>
          {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
          <form className="editor-grid" onSubmit={handleSave}>
            <label>分类名称 <span className="required">*</span><input type="text" maxLength={64} required value={form.name || ''} onChange={(event) => setField('name', event.target.value)} /></label>
            <label>分类标识 slug <span className="required">*</span><input type="text" maxLength={64} required placeholder={isNotice ? '例如 bid-notice' : '例如 group-news'} value={form.slug || ''} onChange={(event) => setField('slug', event.target.value)} /></label>
            {!isNotice ? (
              <label>类型
                <select value={form.type || 'list'} onChange={(event) => setField('type', event.target.value)}>
                  <option value="list">列表</option>
                  <option value="page">单页</option>
                  <option value="link">链接</option>
                  <option value="module">模块</option>
                </select>
              </label>
            ) : null}
            <label>父级栏目
              <select value={parentId(form.parent)} onChange={(event) => setField('parent', event.target.value)}>
                <option value="">无（顶级栏目）</option>
                {parentChoices.map((item) => <option key={item.id} value={item.id}>{navigationPath(item, navigationItems)}</option>)}
              </select>
            </label>
            <label>前台路径<input type="text" maxLength={128} placeholder={isNotice ? '/disclosure/bid-notice' : '/channels/group-news'} value={form.path || ''} onChange={(event) => setField('path', event.target.value)} /></label>
            <label>排序<input type="number" step="1" value={String(form.sort ?? 0)} onChange={(event) => setField('sort', Number(event.target.value || 0))} /></label>
            <label>状态
              <select value={form.status || 'enabled'} onChange={(event) => setField('status', event.target.value)}>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            {!isNotice ? <label className="span-2">分类说明<textarea rows={3} maxLength={500} value={form.description || ''} onChange={(event) => setField('description', event.target.value)} /></label> : null}
            <div className="form-actions span-2"><button className="primary-link-button" type="submit">保存分类</button></div>
          </form>
        </section>

        <div className="split-grid-right">
          <section className="notice-card">
            <form className="filter-form compact-filter" onSubmit={handleSearch}>
              <label>搜索<input type="search" placeholder={isNotice ? '名称 / slug' : '名称 / slug / 说明'} value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label>
              <label>状态
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">全部状态</option>
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </label>
              <button className="secondary-button" type="submit">查询</button>
            </form>
          </section>

          <section className="table-card" aria-live="polite">
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>名称</th><th>Slug</th><th>状态</th><th>排序</th><th>{copy.countLabel}</th>{!isNotice ? <th>说明</th> : null}<th>操作</th></tr></thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={isNotice ? 6 : 7}>正在加载...</td></tr>
                  ) : items.length ? items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name || '未命名'}</td>
                      <td>{item.slug || '-'}</td>
                      <td><span className={`status-badge ${item.status === 'enabled' ? 'status-published' : 'status-archived'}`}>{item.status === 'enabled' ? '启用' : '停用'}</span></td>
                      <td>{Number.isFinite(Number(item.sort)) ? String(item.sort) : '0'}</td>
                      <td>{String(usage[item.id] ?? 0)}</td>
                      {!isNotice ? <td>{item.description || '-'}</td> : null}
                      <td>
                        <div className="table-actions">
                          <button className="text-button" type="button" onClick={() => editCategory(item.id)}>编辑</button>
                          <button className="text-button" type="button" onClick={() => toggleCategory(item)}>{item.status === 'enabled' ? '停用' : '启用'}</button>
                          <button className="text-button" type="button" onClick={() => deleteCategory(item)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={isNotice ? 6 : 7}>{copy.empty}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {!isNotice ? <div className="pagination-bar">
              <button className="secondary-button" type="button" disabled={page <= 1 || isLoading} onClick={() => void loadCategories(Math.max(1, page - 1))}>上一页</button>
              <span>第 {page} / {totalPages} 页，共 {total} 条</span>
              <button className="secondary-button" type="button" disabled={page >= totalPages || isLoading} onClick={() => void loadCategories(Math.min(totalPages, page + 1))}>下一页</button>
            </div> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
