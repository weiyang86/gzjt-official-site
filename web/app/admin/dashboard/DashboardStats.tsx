'use client';

import { useEffect, useState } from 'react';
import { AdminApi, type DashboardStats as DashboardStatsPayload } from '@/lib/admin/admin-api';

const statItems = [
  { key: 'news_articles', label: '新闻数量', hint: '后台文章总数' },
  { key: 'news_categories', label: '新闻分类数量', hint: '新闻栏目总数' },
  { key: 'notice_articles', label: '公示公告数量', hint: '公告文章总数' },
  { key: 'notice_categories', label: '公示公告分类数量', hint: '公告栏目总数' },
] as const;

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsPayload | null>(null);

  useEffect(() => {
    let isMounted = true;
    AdminApi.dashboardStats()
      .then((result) => {
        if (!isMounted) return;
        setStats(result.data || {});
      })
      .catch(() => {
        if (isMounted) setStats({});
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="dashboard-stats-grid" aria-label="工作台统计">
      {statItems.map((item) => (
        <article className="dashboard-stat-card" key={item.key}>
          <p className="dashboard-stat-label">{item.label}</p>
          <strong className="dashboard-stat-value">{Number(stats?.[item.key] || 0)}</strong>
          <span className="dashboard-stat-hint">{item.hint}</span>
        </article>
      ))}
    </section>
  );
}
