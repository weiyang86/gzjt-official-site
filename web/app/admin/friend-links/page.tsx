import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ManagedLinkManager } from '../components/content/ManagedLinkManager';

export const metadata: Metadata = {
  title: '友情链接 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminFriendLinksPage() {
  return (
    <AdminShell active="friendLinks">
      <ManagedLinkManager kind="friend" />
    </AdminShell>
  );
}
