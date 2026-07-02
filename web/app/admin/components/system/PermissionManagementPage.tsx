'use client';

import { useEffect, useState } from 'react';
import { AdminApi, type AdminUser } from '@/lib/admin/admin-api';
import { adminMenuItems, menuKeysWithDashboard, type AdminMenuKey } from '@/lib/admin/menu-permissions';
import { getAdminDisplayName } from '../admin-user';

type Overview = {
  menus?: typeof adminMenuItems;
  users?: AdminUser[];
};

export function PermissionManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AdminMenuKey[]>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await AdminApi.permissionsOverview();
      const data = (result.data || {}) as Overview;
      const nextUsers = data.users || [];
      const nextDrafts: Record<string, AdminMenuKey[]> = {};
      nextUsers.forEach((user) => {
        if (!user.id) return;
        nextDrafts[user.id] = menuKeysWithDashboard(user.menu_permissions || []);
      });
      setUsers(nextUsers);
      setDrafts(nextDrafts);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '权限数据加载失败' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMenu = (userId: string, key: AdminMenuKey) => {
    if (key === 'dashboard') return;
    setDrafts((prev) => {
      const current = menuKeysWithDashboard(prev[userId] || []);
      const exists = current.includes(key);
      return {
        ...prev,
        [userId]: menuKeysWithDashboard(exists ? current.filter((item) => item !== key) : [...current, key]),
      };
    });
  };

  const savePermissions = async (user: AdminUser) => {
    if (!user.id) return;
    setSavingUserId(user.id);
    setMessage(null);
    try {
      await AdminApi.updateUserPermissions(user.id, drafts[user.id] || []);
      setMessage({ type: 'success', text: `${user.email || getAdminDisplayName(user)} 的菜单权限已保存。` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '权限保存失败' });
    } finally {
      setSavingUserId('');
    }
  };

  return (
    <main className="dashboard-content">
      <section className="notice-card">
        <p className="eyebrow">权限管理</p>
        <h2>后台菜单权限</h2>
        <p>本阶段权限控制后台菜单显示和同源后台接口访问。Directus 的集合读写权限仍由 Directus 角色和 Access Policies 管理。</p>
      </section>

      {message && <div className={`inline-message ${message.type}`}>{message.text}</div>}

      <section className="table-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">用户权限矩阵</p>
            <h2>按用户分配菜单</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadData}>刷新</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table permission-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>角色</th>
                {adminMenuItems.map((item) => <th key={item.key}>{item.label}</th>)}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={adminMenuItems.length + 3}>正在加载...</td></tr>}
              {!isLoading && users.length === 0 && <tr><td colSpan={adminMenuItems.length + 3}>暂无用户。</td></tr>}
              {!isLoading && users.map((user) => {
                const userId = user.id || '';
                const allowed = new Set(drafts[userId] || []);
                return (
                  <tr key={userId || user.email}>
                    <td><strong>{user.email}</strong><br /><span className="muted-text">{getAdminDisplayName(user)}</span></td>
                    <td>{user.role?.name || '-'}</td>
                    {adminMenuItems.map((item) => (
                      <td key={item.key}>
                        <label className="table-check" title={item.label}>
                          <input
                            type="checkbox"
                            checked={allowed.has(item.key)}
                            disabled={item.key === 'dashboard' || user.is_super_admin}
                            onChange={() => toggleMenu(userId, item.key)}
                          />
                        </label>
                      </td>
                    ))}
                    <td>
                      {user.is_super_admin ? (
                        <span className="muted-text">系统管理员默认全部权限</span>
                      ) : (
                        <button className="text-button" type="button" disabled={savingUserId === userId} onClick={() => savePermissions(user)}>
                          {savingUserId === userId ? '保存中...' : '保存'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
