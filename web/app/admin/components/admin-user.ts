import type { AdminUser } from '@/lib/admin/admin-api';

export const getAdminDisplayName = (user?: AdminUser | null) => {
  if (!user) return '已登录用户';
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.email || '已登录用户';
};
