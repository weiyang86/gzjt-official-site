import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import SeoManagerPage from '../components/seo/SeoManagerPage';

export const metadata: Metadata = { title: 'SEO 设置 - 甘孜建设投资集团官网内容管理后台' };

export default function Page() {
  return <AdminShell active="seo"><SeoManagerPage /></AdminShell>;
}
