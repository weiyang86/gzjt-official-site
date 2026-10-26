'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminApi, type AdminUser } from '@/lib/admin/admin-api';
import type { AdminMenuKey } from '@/lib/admin/menu-permissions';

type QuickLink = {
  key: AdminMenuKey;
  icon: string;
  title: string;
  description: string;
  href: string;
  action: string;
  variant?: 'button' | 'link';
};

const quickLinks: QuickLink[] = [
  {
    key: 'analytics',
    icon: '统',
    title: '访问统计',
    description: '查看站点 PV、UV、热门页面、来源和关键行为。',
    href: '/admin/analytics',
    action: '查看访问统计',
    variant: 'button',
  },
  {
    key: 'articles',
    icon: '新',
    title: '新闻管理',
    description: '查看新闻列表、筛选栏目和状态。',
    href: '/admin/articles',
    action: '进入管理',
    variant: 'button',
  },
  {
    key: 'articleEdit',
    icon: '加',
    title: '新增新闻',
    description: '创建草稿、上传封面、填写正文并提交发布。',
    href: '/admin/article-edit',
    action: '新增新闻',
    variant: 'button',
  },
  {
    key: 'categories',
    icon: '类',
    title: '新闻分类',
    description: '维护新闻栏目名称、标识、排序和启停状态。',
    href: '/admin/categories',
    action: '管理分类',
  },
  {
    key: 'noticeArticles',
    icon: '告',
    title: '公示公告',
    description: '维护公示公告列表、分类和编辑入口。',
    href: '/admin/notice-articles',
    action: '进入公告管理',
  },
  {
    key: 'content',
    icon: '页',
    title: '页面内容管理',
    description: '管理一级栏目下的二级页面占位项和内容模块。',
    href: '/admin/content',
    action: '进入页面内容管理',
  },
  {
    key: 'quickLinks',
    icon: '快',
    title: '快捷入口',
    description: '维护官网页脚的快捷入口链接和排序。',
    href: '/admin/quick-links',
    action: '管理快捷入口',
  },
  {
    key: 'footerSettings',
    icon: '底',
    title: '底部导航与友情链接',
    description: '维护官网页脚信息和友情链接，前台仅展示已启用内容。',
    href: '/admin/footer-settings',
    action: '管理页脚与友情链接',
  },
  {
    key: 'messages',
    icon: '言',
    title: '留言管理',
    description: '查看前台留言并登记处理状态与回复。',
    href: '/admin/messages',
    action: '进入留言管理',
  },
  {
    key: 'permissions',
    icon: '权',
    title: '权限说明',
    description: '配置后台账号可见菜单，配合接口拦截控制后台模块访问。',
    href: '/admin/permissions',
    action: '进入权限管理',
  },
  {
    key: 'users',
    icon: '人',
    title: '人员管理',
    description: '新增、编辑和停用后台登录账号，并分配菜单权限。',
    href: '/admin/users',
    action: '进入人员管理',
  },
];

const getVisibleLinks = (user: AdminUser | null) => {
  if (!user) return [];
  if (user.is_super_admin) return quickLinks;
  const allowed = new Set(user.menu_permissions || ['dashboard']);
  return quickLinks.filter((item) => allowed.has(item.key));
};

export function DashboardQuickLinks() {
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    AdminApi.me()
      .then((result) => {
        if (!isMounted) return;
        setUser(result.data || null);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleLinks = useMemo(() => getVisibleLinks(user), [user]);

  if (!visibleLinks.length) return null;

  return (
    <section className="dashboard-grid" aria-label="快捷入口">
      {visibleLinks.map((item) => (
        <article className="quick-card" key={item.key}>
          <span className="quick-icon">{item.icon}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <a className={item.variant === 'button' ? 'secondary-button' : 'text-link'} href={item.href}>
            {item.action}
          </a>
        </article>
      ))}
    </section>
  );
}
