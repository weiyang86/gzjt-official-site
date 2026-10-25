import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import ReportManagerPage from '../components/report/ReportManagerPage';

export const metadata: Metadata = { title: '举报入口设置 - 甘孜建设投资集团官网内容管理后台' };

export default function Page() {
  return <AdminShell active="report"><ReportManagerPage /></AdminShell>;
}
