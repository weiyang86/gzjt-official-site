import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { PermissionManagementPage } from '../components/system/PermissionManagementPage';

export const metadata: Metadata = {
  title: '权限管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminPermissionsPage() {
  return (
    <AdminShell active="permissions">
      <PermissionManagementPage />
    </AdminShell>
  );
}
