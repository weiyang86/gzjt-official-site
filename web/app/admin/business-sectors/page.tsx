import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { BusinessSectorManager } from '../components/content/BusinessSectorManager';

export const metadata: Metadata = {
  title: '业务板块 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminBusinessSectorsPage() {
  return (
    <AdminShell active="businessSectors">
      <BusinessSectorManager />
    </AdminShell>
  );
}
