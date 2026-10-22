import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { HomeStatsManagerPage } from '../components/home-stats/HomeStatsManagerPage';

export const metadata: Metadata = { title: '经营指标看板 - 甘孜建设投资集团官网内容管理后台' };

export default function Page() {
  return <AdminShell active="homeStats"><HomeStatsManagerPage /></AdminShell>;
}
