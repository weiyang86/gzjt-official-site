import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import AnalyticsDashboardPage from '../components/analytics/AnalyticsDashboardPage';

export const metadata: Metadata = { title: '访问统计 - 甘孜建设投资集团官网内容管理后台' };

export default function Page() {
  return <AdminShell active="analytics"><AnalyticsDashboardPage /></AdminShell>;
}
