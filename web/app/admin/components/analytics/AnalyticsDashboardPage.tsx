'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AdminApi, type AnalyticsOverview, type AnalyticsRankItem } from '@/lib/admin/admin-api';

type Message = { text: string; type: 'success' | 'error' } | null;

const dayOptions = [7, 14, 30, 90];

const formatNumber = (value: number | undefined) => (value || 0).toLocaleString('zh-CN');

const barStyle = (share: number) => ({
  display: 'block',
  height: '6px',
  borderRadius: '3px',
  background: '#2f6f4f',
  width: `${Math.min(100, Math.max(2, share))}%`,
});

function RankTable({ rows, emptyText, firstColumn }: {
  rows: AnalyticsRankItem[];
  emptyText: string;
  firstColumn: string;
}) {
  if (!rows.length) return <p className="form-message">{emptyText}</p>;
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>{firstColumn}</th>
          <th>浏览量</th>
          <th>访客数</th>
          <th>占比</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>
              {row.label}
              {row.label !== row.key ? <span className="text-link"> {row.key}</span> : null}
            </td>
            <td>{formatNumber(row.pv)}</td>
            <td>{formatNumber(row.uv)}</td>
            <td>
              <span>{row.share}%</span>
              <span style={{ display: 'block', background: '#e6ece8', borderRadius: '3px', marginTop: '4px' }}>
                <span style={barStyle(row.share)} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AnalyticsDashboardPage() {
  const [report, setReport] = useState<AnalyticsOverview | null>(null);
  const [days, setDays] = useState(14);
  const [retentionDays, setRetentionDays] = useState('90');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const load = useCallback(async (targetDays: number) => {
    setIsLoading(true);
    try {
      const result = await AdminApi.analytics(targetDays);
      const data = result.data || null;
      setReport(data);
      if (data?.retentionDays) setRetentionDays(String(data.retentionDays));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '访问统计数据加载失败。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    AdminApi.analytics(days)
      .then((result) => {
        if (!active) return;
        setReport(result.data || null);
        if (result.data?.retentionDays) setRetentionDays(String(result.data.retentionDays));
      })
      .catch((err) => {
        if (!active) return;
        setMessage({ text: err instanceof Error ? err.message : '访问统计数据加载失败。', type: 'error' });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const saveRetention = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number.parseInt(retentionDays, 10);
    if (!Number.isFinite(value) || value < 7 || value > 365) {
      setMessage({ text: '数据保留天数需为 7 到 365 之间的整数。', type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await AdminApi.updateAnalyticsSettings(value);
      setReport(result.data || null);
      setMessage({ text: `数据保留天数已更新为 ${value} 天，超出保留期的日文件已清理。`, type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '数据保留设置保存失败。', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const purge = async () => {
    setIsPurging(true);
    setMessage(null);
    try {
      const result = await AdminApi.purgeAnalytics();
      const removed = result.data?.removed || 0;
      setMessage({ text: `已清理 ${removed} 个超出保留期的数据文件。`, type: 'success' });
      await load(days);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '数据清理失败。', type: 'error' });
    } finally {
      setIsPurging(false);
    }
  };

  const summary = report?.summary;
  const hasData = Boolean(summary && summary.pv > 0);

  return (
    <main className="dashboard-content analytics-page">
      <section className="notice-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">SITE ANALYTICS</p>
            <h2>访问统计</h2>
          </div>
          <a className="secondary-button" href="/admin/dashboard">返回工作台</a>
        </div>
        <p>统计由站点自带采集脚本记录，包含页面浏览量（PV）、访客数（UV）、热门页面、来源站点、设备类型和关键行为（站内搜索、举报电话点击、邮箱点击、附件下载、外链点击）。</p>
        <p>采集仅保存随机访客标识的哈希值、页面路径、来源域名与设备类型，不记录 IP、账号、手机号等个人信息；后台与采集接口路径本身不会被统计。数据按北京时间自然日汇总。</p>
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <h2>统计范围</h2>
          <div>
            {dayOptions.map((option) => (
              <button
                key={option}
                className={option === days ? 'primary-button' : 'secondary-button'}
                type="button"
                onClick={() => setDays(option)}
                style={{ marginLeft: '8px' }}
              >
                近 {option} 天
              </button>
            ))}
          </div>
        </div>
        {isLoading ? <p className="form-message">正在加载访问数据...</p> : null}
        {message ? <p className={`form-message ${message.type}`}>{message.text}</p> : null}

        <div className="dashboard-grid">
          <article className="quick-card">
            <span className="quick-icon">PV</span>
            <h3>{formatNumber(summary?.todayPv)}</h3>
            <p>今日浏览量</p>
          </article>
          <article className="quick-card">
            <span className="quick-icon">UV</span>
            <h3>{formatNumber(summary?.todayUv)}</h3>
            <p>今日访客数</p>
          </article>
          <article className="quick-card">
            <span className="quick-icon">PV</span>
            <h3>{formatNumber(summary?.pv)}</h3>
            <p>近 {days} 天浏览量</p>
          </article>
          <article className="quick-card">
            <span className="quick-icon">UV</span>
            <h3>{formatNumber(summary?.uv)}</h3>
            <p>近 {days} 天访客数</p>
          </article>
        </div>

        {!isLoading && !hasData ? (
          <p className="form-message">当前统计周期内暂无访问数据。请打开前台任意页面后回到本页刷新。</p>
        ) : null}
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <h2>每日趋势</h2>
          <span className="status-badge status-published">北京时间</span>
        </div>
        {report && report.daily.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>浏览量（PV）</th>
                <th>访客数（UV）</th>
              </tr>
            </thead>
            <tbody>
              {report.daily.map((point) => (
                <tr key={point.date}>
                  <td>{point.date}</td>
                  <td>{formatNumber(point.pv)}</td>
                  <td>{formatNumber(point.uv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="form-message">暂无每日数据。</p>}
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <h2>关键页面访问</h2>
          <span className="status-badge status-draft">按浏览量排序</span>
        </div>
        <RankTable rows={report?.topPages || []} emptyText="暂无页面访问记录。" firstColumn="页面" />
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <h2>来源站点</h2>
        </div>
        <RankTable rows={report?.topReferrers || []} emptyText="暂无来源记录。" firstColumn="来源" />
      </section>

      <section className="editor-card">
        <div className="section-title-row">
          <h2>设备与关键行为</h2>
        </div>
        <div className="editor-grid">
          <div>
            <h3>设备类型</h3>
            {report && report.devices.length ? (
              <table className="admin-table">
                <thead>
                  <tr><th>设备</th><th>浏览量</th><th>占比</th></tr>
                </thead>
                <tbody>
                  {report.devices.map((item) => (
                    <tr key={item.key}>
                      <td>{item.label}</td>
                      <td>{formatNumber(item.count)}</td>
                      <td>{item.share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="form-message">暂无设备数据。</p>}
          </div>
          <div>
            <h3>关键行为</h3>
            {report && report.actions.length ? (
              <table className="admin-table">
                <thead>
                  <tr><th>行为</th><th>次数</th></tr>
                </thead>
                <tbody>
                  {report.actions.map((item) => (
                    <tr key={item.name}>
                      <td>{item.label}</td>
                      <td>{formatNumber(item.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="form-message">暂无关键行为记录。</p>}
          </div>
        </div>
      </section>

      <form onSubmit={saveRetention}>
        <section className="editor-card">
          <div className="section-title-row">
            <h2>数据保留设置</h2>
            <span className="status-badge status-published">当前 {report?.retentionDays || retentionDays} 天</span>
          </div>
          <div className="editor-grid">
            <label>保留天数（7–365）
              <input
                value={retentionDays}
                onChange={(event) => setRetentionDays(event.target.value)}
                inputMode="numeric"
                placeholder="90"
              />
            </label>
          </div>
          <p>超出保留期的按日统计文件会在保存设置、查看统计或手动清理时删除；访客标识经加盐哈希后保存，不含 IP 和账号信息，无法还原为个人身份。</p>
          <div className="section-title-row">
            <button className="secondary-button" type="button" onClick={purge} disabled={isPurging}>
              {isPurging ? '正在清理...' : '立即清理过期数据'}
            </button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? '正在保存...' : '保存保留设置'}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
