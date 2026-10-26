import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ProjectManagerPage } from '../components/content/ProjectManagerPage';

export const metadata: Metadata = {
  title: '项目管理 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminProjectsPage() {
  return (
    <AdminShell active="projects">
      <ProjectManagerPage />
    </AdminShell>
  );
}
