import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { PageModulesManagerPage } from '../components/content/PageModulesManagerPage';

export const metadata: Metadata = {
  title: '页面模块占位管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminPageModulesPage() {
  return (
    <AdminShell active="content">
      <PageModulesManagerPage />
    </AdminShell>
  );
}
