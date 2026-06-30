import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ArticleEditorPage } from '../components/editor/ArticleEditorPage';

export const metadata: Metadata = {
  title: '编辑新闻 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminArticleEditPage() {
  return (
    <AdminShell active="articleEdit">
      <ArticleEditorPage scope="news" />
    </AdminShell>
  );
}
