import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { UserManagementPage } from '../components/system/UserManagementPage';

export const metadata: Metadata = {
  title: '人员管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminUsersPage() {
  return (
    <AdminShell active="users">
      <UserManagementPage />
    </AdminShell>
  );
}
