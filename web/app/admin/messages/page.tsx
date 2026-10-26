import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { MessageManagerPage } from '../components/content/MessageManagerPage';

export const metadata: Metadata = {
  title: '留言管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminMessagesPage() {
  return (
    <AdminShell active="messages">
      <MessageManagerPage />
    </AdminShell>
  );
}
