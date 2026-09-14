import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { DashboardQuickLinks } from './DashboardQuickLinks';
import { DashboardStats } from './DashboardStats';
import { UserDetails } from './UserDetails';

export const metadata: Metadata = {
  title: '工作台 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminDashboardPage() {
  return (
    <AdminShell active="dashboard">
      <main className="dashboard-content">
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <p className="eyebrow">Dashboard</p>
          <h2 className="dashboard-hero-title" id="dashboard-title">工作台</h2>
        </section>

        <DashboardStats />

        <DashboardQuickLinks />

        <section className="user-card" aria-labelledby="user-title">
          <div>
            <p className="eyebrow">当前登录用户</p>
            <h2 id="user-title">账号信息</h2>
          </div>
          <UserDetails />
        </section>
      </main>
    </AdminShell>
  );
}
