import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { TopicManagerPage } from '../components/content/TopicManagerPage';

export const metadata: Metadata = {
  title: '专题管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminTopicsPage() {
  return (
    <AdminShell active="topics">
      <TopicManagerPage />
    </AdminShell>
  );
}
