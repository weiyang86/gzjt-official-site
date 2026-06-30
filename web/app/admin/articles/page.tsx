import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ArticleListPage } from '../components/lists/ArticleListPage';

export const metadata: Metadata = {
  title: '新闻管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminArticlesPage() {
  return (
    <AdminShell active="articles">
      <ArticleListPage scope="news" />
    </AdminShell>
  );
}
