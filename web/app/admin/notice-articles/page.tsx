import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ArticleListPage } from '../components/lists/ArticleListPage';

export const metadata: Metadata = {
  title: '公示公告管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminNoticeArticlesPage() {
  return (
    <AdminShell active="noticeArticles">
      <ArticleListPage scope="notice" />
    </AdminShell>
  );
}
