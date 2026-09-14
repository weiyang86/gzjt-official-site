'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminApi, type AdminUser } from '@/lib/admin/admin-api';
import { adminMenuItems, type AdminMenuKey } from '@/lib/admin/menu-permissions';
import { getAdminDisplayName } from './admin-user';

export function AdminShell({ children, active = 'dashboard' }: {
  children: ReactNode;
  active?: AdminMenuKey;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [userLabel, setUserLabel] = useState('正在验证登录态...');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AdminApi.me()
      .then((result) => {
        if (!isMounted) return;
        if (!result.data) {
          AdminApi.redirectToLogin();
          return;
        }
        setUser(result.data);
        setUserLabel(getAdminDisplayName(result.data));
      })
      .catch((err) => {
        if (!isMounted) return;
        const status = typeof err === 'object' && err && 'status' in err ? err.status : undefined;
        if (status !== 401) setUserLabel('账号信息加载失败');
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await AdminApi.logout();
    } catch {
      // 页面仍回到登录页，避免用户停留在后台界面。
    } finally {
      window.location.href = '/admin/login';
    }
  };

  const allowedMenus = user?.is_super_admin
    ? null
    : new Set(user?.menu_permissions?.length ? user.menu_permissions : ['dashboard']);
  const visibleNavItems = allowedMenus
    ? adminMenuItems.filter((item) => allowedMenus.has(item.key))
    : adminMenuItems;
  const contentNavItems = visibleNavItems.filter((item) => item.group === 'content');
  const systemNavItems = visibleNavItems.filter((item) => item.group === 'system');
  const renderNavItems = (items: typeof adminMenuItems) => items.map((item) => (
    <a className={`admin-nav-link${active === item.key ? ' is-active' : ''}`} href={item.href} key={item.key}>
      {item.label}
    </a>
  ));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="后台菜单">
        <div className="sidebar-brand">
          <span className="brand-mark">甘</span>
          <div>
            <strong>内容管理后台</strong>
            <small>新闻维护</small>
          </div>
        </div>
        <nav className="admin-nav">
          {renderNavItems(contentNavItems)}
          {systemNavItems.length > 0 && <div className="admin-nav-group">系统管理</div>}
          {renderNavItems(systemNavItems)}
          <button className="admin-nav-link nav-button" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? '正在退出...' : '退出登录'}
          </button>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">GZJT CMS</p>
            <h1>甘孜建设投资集团官网内容管理后台</h1>
          </div>
          <div className="topbar-user">{user ? getAdminDisplayName(user) : userLabel}</div>
        </header>
        {children}
      </div>
    </div>
  );
}
