import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { CategoryManagerPage } from '../components/lists/CategoryManagerPage';

export const metadata: Metadata = {
  title: '新闻分类 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminCategoriesPage() {
  return (
    <AdminShell active="categories">
      <CategoryManagerPage scope="news" />
    </AdminShell>
  );
}
