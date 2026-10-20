import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { ArticleOwnershipManagerPage } from '../components/navigation/ArticleOwnershipManagerPage';
export const metadata: Metadata = { title: '文章归属管理 - 甘孜建设投资集团官网内容管理后台' };
export default function Page() { return <AdminShell active="articleOwnership"><ArticleOwnershipManagerPage /></AdminShell>; }
