export type AdminMenuKey =
  | 'dashboard'
  | 'analytics'
  | 'articles'
  | 'categories'
  | 'navigation'
  | 'quickLinks'
  | 'homeStats'
  | 'footerSettings'
  | 'articleOwnership'
  | 'topics'
  | 'projects'
  | 'messages'
  | 'noticeArticles'
  | 'noticeCategories'
  | 'noticeEdit'
  | 'content'
  | 'report'
  | 'downloads'
  | 'seo'
  | 'articleEdit'
  | 'users'
  | 'permissions';

export type AdminMenuItem = {
  key: AdminMenuKey;
  href: string;
  label: string;
  group: 'content' | 'system';
};

export const adminMenuItems: AdminMenuItem[] = [
  { key: 'dashboard', href: '/admin/dashboard', label: '工作台', group: 'content' },
  { key: 'analytics', href: '/admin/analytics', label: '访问统计', group: 'content' },
  { key: 'articles', href: '/admin/articles', label: '新闻管理', group: 'content' },
  { key: 'categories', href: '/admin/categories', label: '新闻分类', group: 'content' },
  { key: 'navigation', href: '/admin/navigation', label: '导航树管理', group: 'content' },
  { key: 'quickLinks', href: '/admin/quick-links', label: '快捷入口配置', group: 'content' },
  { key: 'homeStats', href: '/admin/home-stats', label: '经营指标看板', group: 'content' },
  { key: 'footerSettings', href: '/admin/footer-settings', label: '底部导航与友情链接', group: 'content' },
  { key: 'articleOwnership', href: '/admin/article-ownership', label: '文章归属管理', group: 'content' },
  { key: 'topics', href: '/admin/topics', label: '专题管理', group: 'content' },
  { key: 'projects', href: '/admin/projects', label: '项目管理', group: 'content' },
  { key: 'messages', href: '/admin/messages', label: '留言管理', group: 'content' },
  { key: 'noticeArticles', href: '/admin/notice-articles', label: '公示公告管理', group: 'content' },
  { key: 'noticeCategories', href: '/admin/notice-categories', label: '公示公告分类', group: 'content' },
  { key: 'noticeEdit', href: '/admin/notice-edit', label: '新增公示公告', group: 'content' },
  { key: 'content', href: '/admin/content', label: '页面内容管理', group: 'content' },
  { key: 'report', href: '/admin/report', label: '举报入口设置', group: 'content' },
  { key: 'downloads', href: '/admin/downloads', label: '资料下载', group: 'content' },
  { key: 'seo', href: '/admin/seo', label: 'SEO 设置', group: 'content' },
  { key: 'articleEdit', href: '/admin/article-edit', label: '新增新闻', group: 'content' },
  { key: 'users', href: '/admin/users', label: '人员管理', group: 'system' },
  { key: 'permissions', href: '/admin/permissions', label: '权限管理', group: 'system' },
];

export const allAdminMenuKeys = adminMenuItems.map((item) => item.key);

export const normalizeMenuKeys = (value: unknown): AdminMenuKey[] => {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(allAdminMenuKeys);
  return Array.from(new Set(value.filter((item): item is AdminMenuKey => typeof item === 'string' && allowed.has(item as AdminMenuKey))));
};

export const menuKeysWithDashboard = (value: unknown): AdminMenuKey[] => {
  const keys = normalizeMenuKeys(value);
  return keys.includes('dashboard') ? keys : ['dashboard', ...keys];
};
