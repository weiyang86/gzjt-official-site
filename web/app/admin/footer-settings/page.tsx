import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import FooterSettingsManagerPage from '../components/footer-settings/FooterSettingsManagerPage';
export const metadata: Metadata = { title: '底部导航与友情链接 - 甘孜建设投资集团官网内容管理后台' };
export default function Page() { return <AdminShell active="footerSettings"><FooterSettingsManagerPage /></AdminShell>; }
