import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../../admin/css/admin.css';

export const metadata: Metadata = {
  title: '甘孜建设投资集团官网内容管理后台',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
