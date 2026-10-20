import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { NavigationManagerPage } from '../components/navigation/NavigationManagerPage';
export const metadata: Metadata = { title: '导航树管理 - 甘孜建设投资集团官网内容管理后台' };
export default function Page() { return <AdminShell active="navigation"><NavigationManagerPage /></AdminShell>; }
