export type AdminMenuKey =
  | 'dashboard'
  | 'articles'
  | 'categories'
  | 'noticeArticles'
  | 'noticeCategories'
  | 'noticeEdit'
  | 'content'
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
  { key: 'articles', href: '/admin/articles', label: '新闻管理', group: 'content' },
  { key: 'categories', href: '/admin/categories', label: '新闻分类', group: 'content' },
  { key: 'noticeArticles', href: '/admin/notice-articles', label: '公示公告管理', group: 'content' },
  { key: 'noticeCategories', href: '/admin/notice-categories', label: '公示公告分类', group: 'content' },
  { key: 'noticeEdit', href: '/admin/notice-edit', label: '新增公示公告', group: 'content' },
  { key: 'content', href: '/admin/content', label: '页面内容管理', group: 'content' },
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
