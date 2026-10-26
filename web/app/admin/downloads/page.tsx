import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { DownloadManager } from '../components/downloads/DownloadManager';

export const metadata: Metadata = {
  title: '资料下载 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminDownloadsPage() {
  return (
    <AdminShell active="downloads">
      <DownloadManager />
    </AdminShell>
  );
}
