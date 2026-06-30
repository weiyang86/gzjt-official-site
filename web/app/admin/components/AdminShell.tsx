'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminApi, type AdminUser } from '@/lib/admin/admin-api';
import { getAdminDisplayName } from './admin-user';

type AdminNavKey =
  | 'dashboard'
  | 'articles'
  | 'categories'
  | 'noticeArticles'
  | 'noticeCategories'
  | 'noticeEdit'
  | 'content'
  | 'articleEdit';

const navItems: Array<{ key: AdminNavKey; href: string; label: string }> = [
  { key: 'dashboard', href: '/admin/dashboard', label: '工作台' },
  { key: 'articles', href: '/admin/articles', label: '新闻管理' },
  { key: 'categories', href: '/admin/categories', label: '新闻分类' },
  { key: 'noticeArticles', href: '/admin/notice-articles', label: '公示公告管理' },
  { key: 'noticeCategories', href: '/admin/notice-categories', label: '公示公告分类' },
  { key: 'noticeEdit', href: '/admin/notice-edit', label: '新增公示公告' },
  { key: 'content', href: '/admin/content', label: '页面内容管理' },
  { key: 'articleEdit', href: '/admin/article-edit', label: '新增新闻' },
];

export function AdminShell({ children, active = 'dashboard' }: {
  children: ReactNode;
  active?: AdminNavKey;
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
          {navItems.map((item) => (
            <a className={`admin-nav-link${active === item.key ? ' is-active' : ''}`} href={item.href} key={item.key}>
              {item.label}
            </a>
          ))}
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
