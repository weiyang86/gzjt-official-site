import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ContentManagerPage } from '../components/content/ContentManagerPage';

export const metadata: Metadata = {
  title: '页面内容管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminContentPage() {
  return (
    <AdminShell active="content">
      <ContentManagerPage />
    </AdminShell>
  );
}
