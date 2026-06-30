import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ArticleEditorPage } from '../components/editor/ArticleEditorPage';

export const metadata: Metadata = {
  title: '编辑公示公告 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminNoticeEditPage() {
  return (
    <AdminShell active="noticeEdit">
      <ArticleEditorPage scope="notice" />
    </AdminShell>
  );
}
