import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { QuickLinksManagerPage } from '../components/quick-links/QuickLinksManagerPage';

export const metadata: Metadata = { title: '快捷入口配置 - 甘孜建设投资集团官网内容管理后台' };

export default function Page() {
  return <AdminShell active="quickLinks"><QuickLinksManagerPage /></AdminShell>;
}
