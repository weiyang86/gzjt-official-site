import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ManagedLinkManager } from '../components/content/ManagedLinkManager';

export const metadata: Metadata = {
  title: '快捷入口 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminQuickLinksPage() {
  return (
    <AdminShell active="quickLinks">
      <ManagedLinkManager kind="quick" />
    </AdminShell>
  );
}
