'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';
import type { MessageState, PageModule, PageModuleGroup } from './types';

const devStatusText: Record<string, string> = { developing: '正在开发中', enabled: '已启用', disabled: '已停用' };
const statusText: Record<string, string> = { enabled: '启用', disabled: '停用' };

const emptyEditForm = (): PageModule => ({
  id: '',
  module_title: '',
  placeholder_text: '正在开发中',
  remark: '',
  dev_status: 'developing',
  status: 'enabled',
  sort: 0,
});

const statusClass = (status?: string) => {
  if (status === 'enabled') return 'status-published';
  if (status === 'developing') return 'status-draft';
  return 'status-archived';
};

export function PageModulesManagerPage() {
  const [groups, setGroups] = useState<PageModuleGroup[]>([]);
  const [activeParentCode, setActiveParentCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [devStatus, setDevStatus] = useState('');
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<PageModule | null>(null);

  const visibleGroups = useMemo(() => (
    activeParentCode ? groups.filter((group) => group.parent_code === activeParentCode) : groups
  ), [activeParentCode, groups]);

  const loadPageModules = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await AdminApi.pageModulesGrouped({ keyword: keyword.trim(), dev_status: devStatus });
      const rows = (result.data || []) as PageModuleGroup[];
      setGroups(rows);
      if (activeParentCode && !rows.some((group) => group.parent_code === activeParentCode)) {
        setActiveParentCode('');
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '页面模块加载失败。', type: 'error' });
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    loadPageModules();
  };

  const openEdit = (module: PageModule) => {
    setEditing({ ...emptyEditForm(), ...module, sort: Number(module.sort || 0) });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing?.id) return;
    try {
      await AdminApi.updatePageModule(editing.id, {
        placeholder_text: String(editing.placeholder_text || '').trim() || '正在开发中',
        remark: String(editing.remark || '').trim(),
        dev_status: editing.dev_status || 'developing',
        status: editing.status || 'enabled',
        sort: Number(editing.sort || 0),
      });
      setMessage({ text: '页面模块占位信息已保存。', type: 'success' });
      closeEdit();
      await loadPageModules();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '保存占位信息失败。', type: 'error' });
    }
  };

  const enterModule = (module: PageModule) => {
    if (module.dev_status === 'developing') {
      setMessage({ text: `“${module.module_title}”该模块正在开发中。`, type: 'error' });
      window.alert('该模块正在开发中');
      return;
    }
    if (module.module_code) {
      window.location.href = `/admin/content?module=${encodeURIComponent(module.module_code)}`;
      return;
    }
    setMessage({ text: `“${module.module_title}”当前仅提供占位展示，具体编辑功能后续逐步接入。`, type: 'success' });
  };

  const setEditingField = (field: keyof PageModule, value: string | number) => {
    setEditing((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">模块占位</p>
            <h2>一级栏目 / 二级页面管理项</h2>
          </div>
          <a className="secondary-button" href="/admin/dashboard">返回工作台</a>
        </div>
        <p>本页用于展示官网一级目录下的二级页面管理项。未接入具体编辑器的模块会显示“正在开发中”，不会修改官网前台页面、样式或路由。</p>
      </section>

      <section className="notice-card">
        <form className="filter-form page-module-filter" onSubmit={handleSearch}>
          <label>一级栏目
            <select value={activeParentCode} onChange={(event) => setActiveParentCode(event.target.value)}>
              <option value="">全部栏目</option>
              {groups.map((group) => <option value={group.parent_code || ''} key={group.parent_code || 'uncategorized'}>{group.parent_title || '未分组'}（{group.modules?.length || 0}）</option>)}
            </select>
          </label>
          <label>关键词
            <input type="search" placeholder="模块名称 / 编码 / 备注" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <label>开发状态
            <select value={devStatus} onChange={(event) => setDevStatus(event.target.value)}>
              <option value="">全部状态</option>
              <option value="developing">正在开发中</option>
              <option value="enabled">已启用</option>
              <option value="disabled">已停用</option>
            </select>
          </label>
          <button className="secondary-button" type="submit">查询</button>
        </form>
      </section>

      <section className="page-module-shell">
        <aside className="module-parent-panel" aria-label="一级栏目筛选">
          <h2>一级栏目</h2>
          <div className="parent-tabs">
            <button className={`parent-tab${activeParentCode === '' ? ' is-active' : ''}`} type="button" onClick={() => setActiveParentCode('')}>全部栏目</button>
            {groups.map((group) => (
              <button
                className={`parent-tab${activeParentCode === group.parent_code ? ' is-active' : ''}`}
                type="button"
                onClick={() => setActiveParentCode(group.parent_code || '')}
                key={group.parent_code || 'uncategorized'}
              >
                {group.parent_title || '未分组'}（{group.modules?.length || 0}）
              </button>
            ))}
          </div>
        </aside>

        <section className="module-groups-panel" aria-live="polite">
          {message ? <div className={`inline-message ${message.type || ''}`.trim()}>{message.text}</div> : null}
          <div className="module-groups">
            {isLoading ? '正在加载...' : visibleGroups.length ? visibleGroups.map((group) => (
              <section className="module-group-card" key={group.parent_code || 'uncategorized'}>
                <div className="module-group-heading">
                  <div><p className="eyebrow">{group.parent_code || 'uncategorized'}</p><h2>{group.parent_title || '未分组'}</h2></div>
                  <span>{group.modules?.length || 0} 项</span>
                </div>
                <div className="module-card-grid">
                  {(group.modules || []).map((module) => (
                    <article className="module-card" key={module.id || module.module_code}>
                      <div className="module-card-title-row">
                        <div><h3>{module.module_title || '未命名模块'}</h3><code>{module.module_code || '-'}</code></div>
                        <span className={`status-badge ${statusClass(module.dev_status)}`}>{devStatusText[module.dev_status || ''] || module.dev_status || '-'}</span>
                      </div>
                      <dl className="module-meta">
                        <div><dt>前端路径</dt><dd>{module.route_path || '-'}</dd></div>
                        <div><dt>占位说明</dt><dd>{module.placeholder_text || '正在开发中'}</dd></div>
                        <div><dt>备注</dt><dd>{module.remark || '-'}</dd></div>
                        <div><dt>排序</dt><dd>{Number.isFinite(Number(module.sort)) ? String(module.sort) : '0'}</dd></div>
                        <div><dt>管理项状态</dt><dd>{statusText[module.status || ''] || module.status || '-'}</dd></div>
                      </dl>
                      <div className="table-actions">
                        <button className="text-button" type="button" onClick={() => openEdit(module)}>编辑占位信息</button>
                        <button className="text-button" type="button" onClick={() => enterModule(module)}>进入管理</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )) : '暂无页面模块占位项。'}
          </div>
        </section>
      </section>

      {editing ? (
        <dialog className="admin-dialog" open>
          <form className="dialog-card" onSubmit={saveEdit}>
            <div className="section-title-row">
              <div>
                <p className="eyebrow">编辑占位信息</p>
                <h2>{editing.module_title || '页面模块'}</h2>
              </div>
              <button className="text-button" type="button" onClick={closeEdit}>关闭</button>
            </div>
            <div className="editor-grid">
              <label className="span-2">占位说明
                <textarea rows={3} maxLength={500} value={editing.placeholder_text || ''} onChange={(event) => setEditingField('placeholder_text', event.target.value)} />
              </label>
              <label className="span-2">备注
                <textarea rows={3} maxLength={500} value={editing.remark || ''} onChange={(event) => setEditingField('remark', event.target.value)} />
              </label>
              <label>开发状态
                <select value={editing.dev_status || 'developing'} onChange={(event) => setEditingField('dev_status', event.target.value)}>
                  <option value="developing">正在开发中</option>
                  <option value="enabled">已启用</option>
                  <option value="disabled">已停用</option>
                </select>
              </label>
              <label>管理项状态
                <select value={editing.status || 'enabled'} onChange={(event) => setEditingField('status', event.target.value)}>
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </label>
              <label>排序
                <input type="number" step="1" value={String(editing.sort ?? 0)} onChange={(event) => setEditingField('sort', Number(event.target.value || 0))} />
              </label>
            </div>
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={closeEdit}>取消</button>
              <button className="primary-link-button" type="submit">保存占位信息</button>
            </div>
          </form>
        </dialog>
      ) : null}
    </main>
  );
}
