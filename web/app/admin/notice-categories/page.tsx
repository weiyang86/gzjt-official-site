import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { CategoryManagerPage } from '../components/lists/CategoryManagerPage';

export const metadata: Metadata = {
  title: '公示公告分类 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminNoticeCategoriesPage() {
  return (
    <AdminShell active="noticeCategories">
      <CategoryManagerPage scope="notice" />
    </AdminShell>
  );
}
