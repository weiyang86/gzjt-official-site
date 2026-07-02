'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminApi, type AdminRole, type AdminUser } from '@/lib/admin/admin-api';
import { adminMenuItems, menuKeysWithDashboard, type AdminMenuKey } from '@/lib/admin/menu-permissions';
import { getAdminDisplayName } from '../admin-user';

type UserForm = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
  status: string;
  menu_keys: AdminMenuKey[];
};

const emptyForm: UserForm = {
  id: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  role: '',
  status: 'active',
  menu_keys: menuKeysWithDashboard(adminMenuItems.map((item) => item.key)),
};

const statusLabels: Record<string, string> = {
  active: '启用',
  suspended: '停用',
  invited: '已邀请',
  draft: '草稿',
  archived: '归档',
};

const toForm = (user: AdminUser): UserForm => ({
  id: user.id || '',
  email: user.email || '',
  first_name: user.first_name || '',
  last_name: user.last_name || '',
  password: '',
  role: user.role?.id || '',
  status: user.status || 'active',
  menu_keys: menuKeysWithDashboard(user.menu_permissions || []),
});

export function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [keyword, setKeyword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedMenuSet = useMemo(() => new Set(form.menu_keys), [form.menu_keys]);
  const contentMenus = adminMenuItems.filter((item) => item.group === 'content');
  const systemMenus = adminMenuItems.filter((item) => item.group === 'system');

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [userResult, roleResult] = await Promise.all([
        AdminApi.users({ keyword }),
        AdminApi.roles(),
      ]);
      setUsers((userResult.data || []) as AdminUser[]);
      setRoles((roleResult.data || []) as AdminRole[]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '人员数据加载失败' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMenu = (key: AdminMenuKey) => {
    if (key === 'dashboard') return;
    const next = selectedMenuSet.has(key)
      ? form.menu_keys.filter((item) => item !== key)
      : [...form.menu_keys, key];
    updateForm('menu_keys', menuKeysWithDashboard(next));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage(null);
  };

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const payload = {
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      password: form.password || undefined,
      role: form.role || null,
      status: form.status,
      menu_keys: form.menu_keys,
    };
    try {
      if (form.id) {
        await AdminApi.updateUser(form.id, payload);
        setMessage({ type: 'success', text: '人员信息已保存。' });
      } else {
        await AdminApi.createUser(payload);
        setMessage({ type: 'success', text: '人员账号已创建。' });
        setForm(emptyForm);
      }
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const disableUser = async (user: AdminUser) => {
    if (!user.id) return;
    if (!window.confirm(`确认停用账号 ${user.email || getAdminDisplayName(user)}？`)) return;
    setMessage(null);
    try {
      await AdminApi.disableUser(user.id);
      setMessage({ type: 'success', text: '账号已停用。' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '停用失败' });
    }
  };

  const renderMenuChecks = (items: typeof adminMenuItems) => (
    <div className="permission-check-grid">
      {items.map((item) => (
        <label className="check-row" key={item.key}>
          <input
            type="checkbox"
            checked={selectedMenuSet.has(item.key)}
            disabled={item.key === 'dashboard'}
            onChange={() => toggleMenu(item.key)}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <p className="eyebrow">人员管理</p>
        <h2>后台登录用户</h2>
        <p>管理 Directus 后台账号，并为每个账号分配本后台可见菜单。删除操作按停用处理，不物理删除账号。</p>
      </section>

      {message && <div className={`inline-message ${message.type}`}>{message.text}</div>}

      <section className="split-grid system-admin-grid">
        <form className="editor-card" onSubmit={saveUser}>
          <div className="section-title-row">
            <div>
              <p className="eyebrow">{form.id ? '编辑人员' : '新增人员'}</p>
              <h2>{form.id ? form.email : '创建后台账号'}</h2>
            </div>
            {form.id && <button className="secondary-button" type="button" onClick={resetForm}>新增账号</button>}
          </div>

          <div className="editor-grid">
            <label>邮箱 *
              <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} required />
            </label>
            <label>密码{form.id ? '（留空不修改）' : ' *'}
              <input type="password" value={form.password} onChange={(event) => updateForm('password', event.target.value)} required={!form.id} minLength={8} />
            </label>
            <label>姓
              <input value={form.last_name} onChange={(event) => updateForm('last_name', event.target.value)} />
            </label>
            <label>名
              <input value={form.first_name} onChange={(event) => updateForm('first_name', event.target.value)} />
            </label>
            <label>角色
              <select value={form.role} onChange={(event) => updateForm('role', event.target.value)}>
                <option value="">不分配角色</option>
                {roles.map((role) => (
                  <option value={role.id || ''} key={role.id || role.name}>{role.name || role.id}</option>
                ))}
              </select>
            </label>
            <label>状态
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <div className="permission-panel">
            <h3>内容管理菜单</h3>
            {renderMenuChecks(contentMenus)}
            <h3>系统管理菜单</h3>
            {renderMenuChecks(systemMenus)}
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? '正在保存...' : '保存人员'}</button>
          </div>
        </form>

        <section className="table-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">账号列表</p>
              <h2>人员</h2>
            </div>
          </div>
          <form className="filter-form compact-filter" onSubmit={(event) => { event.preventDefault(); loadData(); }}>
            <label>搜索
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="邮箱或姓名" />
            </label>
            <button className="secondary-button" type="submit">查询</button>
          </form>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>账号</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>菜单数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={5}>正在加载...</td></tr>}
                {!isLoading && users.length === 0 && <tr><td colSpan={5}>暂无账号。</td></tr>}
                {!isLoading && users.map((user) => (
                  <tr key={user.id || user.email}>
                    <td><strong>{user.email}</strong><br /><span className="muted-text">{getAdminDisplayName(user)}</span></td>
                    <td>{user.role?.name || '-'}</td>
                    <td><span className={`status-badge ${user.status === 'active' ? 'status-published' : 'status-archived'}`}>{statusLabels[user.status || ''] || user.status || '-'}</span></td>
                    <td>{user.menu_permissions?.length || 0}</td>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" type="button" onClick={() => setForm(toForm(user))}>编辑</button>
                        {user.status !== 'suspended' && <button className="text-button" type="button" onClick={() => disableUser(user)}>停用</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
